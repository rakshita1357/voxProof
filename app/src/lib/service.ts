import "server-only";
import { createHash } from "crypto";
import type { z } from "zod";
import { adapters } from "./adapters";
import { ProviderError, type StartConversationInput } from "./adapters/types";
import { audit, id, mutate, read } from "./db";
import { evaluateCase } from "./evaluation";
import { latencies, runMetrics } from "./metrics";
import type { AgentInput, RunInput } from "./schemas";
import { decrypt, encrypt, redact } from "./security";
import type { Agent, DB, Run, TestCase } from "./types";

const MAX_CASES = { gnani: 12, demo: 36 } as const;
const CALL_TIMEOUT_SEC = 15 * 60;
const MAX_ATTEMPTS = 3;

export async function createAgent(v: z.output<typeof AgentInput>) {
  const now = new Date().toISOString();
  const agent: Agent = {
    id: id(),
    name: v.name,
    provider: v.provider,
    botId: v.provider === "gnani" ? v.botId : "",
    environment: v.environment,
    phone: v.phone,
    countryCode: v.countryCode,
    secret: v.provider === "gnani" && v.apiKey ? encrypt(v.apiKey) : undefined,
    status: "untested",
    authorizedAt: now,
    createdAt: now,
  };
  await mutate((db) => {
    db.agents.push(agent);
    audit(db, "agent.created", agent.id, { provider: agent.provider, authorized: true });
  });
  return agent.id;
}

export async function testConnection(agentId: string) {
  const agent = (await read()).agents.find((a) => a.id === agentId);
  if (!agent) throw new Error("Agent not found");
  const apiKey = agent.secret ? decrypt(agent.secret) : "";
  const check = await adapters[agent.provider].validateConnection(agent, apiKey);
  check.capabilities.forEach((c) => (c.detail = redact(c.detail, apiKey)));
  await mutate((db) => {
    const a = db.agents.find((x) => x.id === agentId);
    if (!a) return;
    a.lastCheck = check;
    a.status = check.ok ? "connected" : "error";
    audit(db, "agent.connection_checked", agentId, { ok: check.ok });
  });
  return check;
}

const seedOf = (...parts: (string | number)[]) => createHash("sha256").update(parts.join("|")).digest().readUInt32BE(0);

export async function createRun(v: z.output<typeof RunInput>) {
  const db = await read();
  const agent = db.agents.find((a) => a.id === v.agentId);
  if (!agent) throw new Error("Agent not found");
  if (agent.status !== "connected") throw new Error("Run a successful connection check on this agent first");
  const scenarios = v.scenarioIds.map((sid) => db.scenarios.find((s) => s.id === sid));
  const personas = v.personaIds.map((pid) => db.personas.find((p) => p.id === pid));
  if (scenarios.some((s) => !s) || personas.some((p) => !p)) throw new Error("Unknown scenario or persona");
  const total = scenarios.length * personas.length * v.samples;
  if (total > MAX_CASES[agent.provider])
    throw new Error(`This run would place ${total} calls; the limit for ${agent.provider} agents is ${MAX_CASES[agent.provider]}`);

  let agentContext: Run["snapshot"]["agentContext"];
  const adapter = adapters[agent.provider];
  if (adapter.getAgentContext && agent.secret) {
    agentContext = await adapter.getAgentContext(agent, decrypt(agent.secret)).catch(() => undefined);
  }

  const run: Run = {
    id: id(),
    agentId: agent.id,
    status: "queued",
    simulated: agent.provider === "demo",
    config: { scenarioIds: v.scenarioIds, personaIds: v.personaIds, samples: v.samples, language: v.language, passThreshold: v.passThreshold },
    snapshot: { agentName: agent.name, scenarios: scenarios.map((s) => ({ ...s! })), personas: personas.map((p) => ({ ...p! })), agentContext },
    baselineRunId: v.baselineRunId,
    createdAt: new Date().toISOString(),
  };
  const now = run.createdAt;
  const cases: TestCase[] = scenarios.flatMap((s) =>
    personas.flatMap((p) =>
      Array.from({ length: v.samples }, (_, sample) => ({
        id: id(),
        runId: run.id,
        scenarioId: s!.id,
        scenarioVersion: s!.version,
        personaId: p!.id,
        sample,
        seed: seedOf(s!.id, s!.version, p!.id, sample),
        status: "queued" as const,
        attempts: 0,
        updatedAt: now,
      })),
    ),
  );
  await mutate((db) => {
    db.runs.unshift(run);
    db.cases.push(...cases);
    audit(db, "run.created", run.id, { cases: cases.length, simulated: run.simulated });
  });
  return run.id;
}

export async function cancelRun(runId: string) {
  await mutate((db) => {
    const run = db.runs.find((r) => r.id === runId);
    if (!run || !["queued", "running"].includes(run.status)) return;
    run.status = "cancelled";
    run.completedAt = new Date().toISOString();
    for (const c of db.cases)
      if (c.runId === runId && ["queued", "calling", "evaluating"].includes(c.status)) {
        if (c.status === "calling") c.error = "Cancelled after the call was placed. Gnani has no API to end an in-progress call.";
        c.status = "cancelled";
      }
    finalizeMetrics(db, run);
    audit(db, "run.cancelled", runId);
  });
}

/** Reset failed/errored cases in place so they run again inside the same run. */
export async function retryCases(runId: string) {
  await mutate((db) => {
    const run = db.runs.find((r) => r.id === runId);
    if (!run || ["queued", "running"].includes(run.status)) return;
    const ids = new Set(
      db.cases.filter((c) => c.runId === runId && ["failed", "error", "insufficient_data"].includes(c.status)).map((c) => c.id),
    );
    if (!ids.size) return;
    db.findings = db.findings.filter((f) => !ids.has(f.caseId));
    for (const c of db.cases)
      if (ids.has(c.id))
        Object.assign(c, { status: "queued", attempts: 0, error: undefined, evaluation: undefined, transcript: undefined, call: undefined, latency: undefined, externalRunId: undefined, triggeredAt: undefined, retryAt: undefined });
    run.status = "running";
    run.completedAt = undefined;
    audit(db, "run.cases_retried", runId, { cases: ids.size });
  });
}

const g = globalThis as unknown as { __vpInflight?: Set<string> };
const inflight = (g.__vpInflight ??= new Set());

/** Idempotent step of the run state machine. Safe to call repeatedly (UI polling drives it). */
export async function advanceRun(runId: string) {
  if (inflight.has(runId)) return;
  inflight.add(runId);
  try {
    for (let i = 0; i < 4; i++) if (!(await step(runId))) break;
  } finally {
    inflight.delete(runId);
  }
}

async function step(runId: string): Promise<boolean> {
  const db = await read();
  const run = db.runs.find((r) => r.id === runId);
  if (!run || !["queued", "running"].includes(run.status)) return false;
  const agent = db.agents.find((a) => a.id === run.agentId);
  if (!agent) {
    await mutate((d) => {
      const r = d.runs.find((x) => x.id === runId)!;
      Object.assign(r, { status: "failed", error: "Agent was deleted", completedAt: new Date().toISOString() });
    });
    return false;
  }
  const apiKey = agent.secret ? decrypt(agent.secret) : "";
  const adapter = adapters[agent.provider];
  const cases = db.cases.filter((c) => c.runId === runId);
  const input = (c: TestCase): StartConversationInput => ({
    agent,
    apiKey,
    caseId: c.id,
    scenario: run.snapshot.scenarios.find((s) => s.id === c.scenarioId)!,
    persona: run.snapshot.personas.find((p) => p.id === c.personaId)!,
    seed: c.seed,
    fixedCategories:
      agent.provider === "demo"
        ? db.findings.filter((f) => f.scenarioId === c.scenarioId && f.disposition === "fixed").map((f) => f.category)
        : [],
  });
  const now = Date.now() / 1000;

  // One call at a time per run: the tester phone can only take one call.
  const active = cases.find((c) => c.status === "calling" || c.status === "evaluating");
  if (active) {
    const claimed = db.cases.flatMap((c) => (c.call?.conversationId && c.id !== active.id ? [c.call.conversationId] : []));
    let result;
    try {
      result = await adapter.getConversation({ ...input(active), externalRunId: active.externalRunId!, triggeredAt: active.triggeredAt!, claimedConversationIds: claimed });
    } catch (e) {
      if (e instanceof ProviderError && e.retriable) return false;
      await updateCase(active.id, { status: "error", error: redact(errMsg(e), apiKey) });
      return true;
    }
    if (!result) {
      if (now - (active.triggeredAt ?? now) > CALL_TIMEOUT_SEC)
        await updateCase(active.id, {
          status: "error",
          error: "No completed conversation found in Gnani logs within 15 minutes. The call may not have been answered, or it could not be matched.",
        });
      return false;
    }
    const scenario = input(active).scenario;
    const persona = input(active).persona;
    const withData: TestCase = {
      ...active,
      status: "evaluating",
      call: result.call,
      transcript: result.turns,
      latency: latencies(result.turns, result.call.startTime),
    };
    await updateCase(active.id, { status: "evaluating", call: withData.call, transcript: withData.transcript, latency: withData.latency });
    const { evaluation, drafts } = await evaluateCase(withData, scenario, persona, run);
    await mutate((d) => {
      const c = d.cases.find((x) => x.id === active.id);
      const r = d.runs.find((x) => x.id === runId);
      if (!c || c.status !== "evaluating" || r?.status === "cancelled") return;
      c.evaluation = evaluation;
      c.status = evaluation.verdict === "pass" ? "passed" : evaluation.verdict === "fail" ? "failed" : "insufficient_data";
      c.updatedAt = new Date().toISOString();
      const createdAt = c.updatedAt;
      d.findings.push(
        ...drafts.map((f) => ({ ...f, id: id(), runId, caseId: c.id, scenarioId: c.scenarioId, personaId: c.personaId, disposition: "open" as const, createdAt })),
      );
    });
    return true;
  }

  const next = cases.find((c) => c.status === "queued" && (c.retryAt ?? 0) <= now);
  if (next) {
    try {
      const { externalRunId } = await adapter.startConversation(input(next));
      await mutate((d) => {
        const r = d.runs.find((x) => x.id === runId)!;
        const c = d.cases.find((x) => x.id === next.id)!;
        if (r.status === "cancelled" || c.status !== "queued") return;
        Object.assign(c, { status: "calling", externalRunId, triggeredAt: Date.now() / 1000, attempts: c.attempts + 1, error: undefined, updatedAt: new Date().toISOString() });
        if (r.status === "queued") Object.assign(r, { status: "running", startedAt: new Date().toISOString() });
        audit(d, "call.triggered", c.id, { provider: agent.provider });
      });
      return true;
    } catch (e) {
      const msg = redact(errMsg(e), apiKey);
      const retriable = e instanceof ProviderError && e.retriable && next.attempts + 1 < MAX_ATTEMPTS;
      // Config errors (not whitelisted, bad key, wrong env) hit every case the same way: stop instead of re-dialling.
      const fatal = e instanceof ProviderError && [400, 401, 403].includes(e.status);
      await mutate((d) => {
        const r = d.runs.find((x) => x.id === runId)!;
        if (r.status === "queued") Object.assign(r, { status: "running", startedAt: new Date().toISOString() });
        for (const c of d.cases.filter((x) => x.runId === runId)) {
          if (c.id === next.id) {
            c.attempts += 1;
            c.error = msg;
            if (retriable) c.retryAt = Date.now() / 1000 + 5 * 2 ** c.attempts;
            else c.status = "error";
          } else if (fatal && c.status === "queued") {
            Object.assign(c, { status: "error", error: `Not attempted: ${msg}` });
          }
        }
      });
      return false;
    }
  }

  if (cases.some((c) => c.status === "queued")) return false; // waiting on backoff
  await mutate((d) => {
    const r = d.runs.find((x) => x.id === runId);
    if (!r || !["queued", "running"].includes(r.status)) return;
    const rc = d.cases.filter((c) => c.runId === runId);
    r.status = rc.every((c) => c.status === "error") ? "failed" : "completed";
    if (r.status === "failed") r.error = rc[0]?.error ?? "All cases failed";
    r.completedAt = new Date().toISOString();
    finalizeMetrics(d, r);
    const a = d.agents.find((x) => x.id === r.agentId);
    if (a) a.lastTestedAt = r.completedAt;
    audit(d, "run.completed", r.id, { status: r.status });
  });
  return false;
}

function finalizeMetrics(db: DB, run: Run) {
  run.metrics = runMetrics(
    db.cases.filter((c) => c.runId === run.id),
    db.findings.filter((f) => f.runId === run.id),
  );
}

async function updateCase(caseId: string, patch: Partial<TestCase>) {
  await mutate((db) => {
    const c = db.cases.find((x) => x.id === caseId);
    if (c) Object.assign(c, patch, { updatedAt: new Date().toISOString() });
  });
}

function errMsg(e: unknown) {
  if (e instanceof ProviderError) return `Gnani ${e.status || "network"}: ${e.message}${e.requestId ? ` (requestId ${e.requestId})` : ""}`;
  return e instanceof Error ? e.message : "Unknown error";
}
