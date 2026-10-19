"use server";
import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { audit, id, mutate, read } from "./db";
import { AgentInput, FindingDisposition, PersonaInput, RunInput, ScenarioInput, firstError } from "./schemas";
import { rateLimit, requireSession } from "./security";
import { advanceRun, cancelRun, createAgent, createRun, retryCases, testConnection } from "./service";
import { SESSION_COOKIE, createSessionToken } from "./session";

export type FormState = { error?: string } | undefined;

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return { error: "APP_PASSWORD is not configured on the server" };
  rateLimit("login", 10);
  const got = Buffer.from(String(fd.get("password") ?? ""));
  const want = Buffer.from(expected);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return { error: "Incorrect password" };
  const { token, maxAge } = await createSessionToken();
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge, path: "/" });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function createAgentAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const parsed = AgentInput.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  try {
    rateLimit("agent.create", 10);
    const agentId = await createAgent(parsed.data);
    await testConnection(agentId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/agents");
  redirect("/agents");
}

export async function testConnectionAction(agentId: string) {
  await requireSession();
  rateLimit("agent.test", 20);
  await testConnection(agentId);
  revalidatePath("/agents");
}

export async function saveScenario(scenarioId: string | null, _: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const parsed = ScenarioInput.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const updatedAt = new Date().toISOString();
  await mutate((db) => {
    const s = scenarioId && db.scenarios.find((x) => x.id === scenarioId);
    // Bumping the version keeps old runs comparable only with runs of the same scenario version.
    if (s) Object.assign(s, parsed.data, { version: s.version + 1, updatedAt });
    else db.scenarios.push({ ...parsed.data, id: id(), version: 1, updatedAt });
    audit(db, scenarioId ? "scenario.updated" : "scenario.created", scenarioId ?? "new");
  });
  revalidatePath("/scenarios");
  redirect("/scenarios");
}

export async function duplicateScenario(scenarioId: string) {
  await requireSession();
  const newId = id();
  await mutate((db) => {
    const s = db.scenarios.find((x) => x.id === scenarioId);
    if (s) db.scenarios.push({ ...s, id: newId, title: `${s.title} (copy)`, version: 1, updatedAt: new Date().toISOString() });
  });
  redirect(`/scenarios/${newId}`);
}

export async function savePersona(personaId: string | null, fd: FormData) {
  await requireSession();
  const parsed = PersonaInput.safeParse(Object.fromEntries(fd));
  if (!parsed.success) throw new Error(firstError(parsed.error));
  await mutate((db) => {
    const p = personaId && db.personas.find((x) => x.id === personaId);
    if (p) Object.assign(p, parsed.data);
    else db.personas.push({ ...parsed.data, id: id() });
  });
  revalidatePath("/scenarios");
}

export async function createRunAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireSession();
  const parsed = RunInput.safeParse({
    ...Object.fromEntries(fd),
    scenarioIds: fd.getAll("scenarioIds"),
    personaIds: fd.getAll("personaIds"),
    baselineRunId: fd.get("baselineRunId") || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  let runId: string;
  try {
    rateLimit("run.create", 10);
    runId = await createRun(parsed.data);
  } catch (e) {
    return { error: (e as Error).message };
  }
  after(() => advanceRun(runId));
  redirect(`/runs/${runId}`);
}

export async function cancelRunAction(runId: string) {
  await requireSession();
  await cancelRun(runId);
  revalidatePath(`/runs/${runId}`);
}

export async function retryCasesAction(runId: string) {
  await requireSession();
  await retryCases(runId);
  after(() => advanceRun(runId));
  revalidatePath(`/runs/${runId}`);
}

/** Re-test: same config (optionally a subset of scenarios) with this run as the baseline. */
export async function retestAction(runId: string, scenarioIds?: string[]) {
  await requireSession();
  rateLimit("run.create", 10);
  const run = (await read()).runs.find((r) => r.id === runId);
  if (!run) throw new Error("Run not found");
  const newId = await createRun({
    agentId: run.agentId,
    scenarioIds: scenarioIds ?? run.config.scenarioIds,
    personaIds: run.config.personaIds,
    samples: run.config.samples,
    language: run.config.language,
    passThreshold: run.config.passThreshold,
    baselineRunId: run.id,
  });
  after(() => advanceRun(newId));
  redirect(`/runs/${newId}`);
}

export async function setFindingDisposition(findingId: string, fd: FormData) {
  await requireSession();
  const disposition = FindingDisposition.parse(fd.get("disposition"));
  await mutate((db) => {
    const f = db.findings.find((x) => x.id === findingId);
    if (f) f.disposition = disposition;
    audit(db, "finding.disposition", findingId, { disposition });
  });
  revalidatePath(`/findings/${findingId}`);
}

export async function createRegressionTest(findingId: string) {
  await requireSession();
  const newId = id();
  await mutate((db) => {
    const f = db.findings.find((x) => x.id === findingId);
    const s = f && db.scenarios.find((x) => x.id === f.scenarioId);
    if (!f || !s) throw new Error("Finding or scenario not found");
    db.scenarios.push({
      ...s,
      id: newId,
      title: `Regression: ${f.title}`.slice(0, 120),
      category: "regression",
      expectedOutcome: `${s.expectedOutcome}\nRegression guard: ${f.expected}`.slice(0, 1000),
      severity: f.severity,
      version: 1,
      updatedAt: new Date().toISOString(),
    });
    audit(db, "scenario.regression_created", newId, { finding: findingId });
  });
  redirect(`/scenarios/${newId}`);
}
