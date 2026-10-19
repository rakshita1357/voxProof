import type { Finding, RunMetrics, TestCase, Turn } from "./types";

export const MIN_P95_SAMPLES = 20;

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * s.length) - 1;
  return s[Math.min(s.length - 1, Math.max(0, idx))];
}

/** Turn latency = agent turn timestamp minus the caller turn right before it. Never inferred from text. */
export function latencies(turns: Turn[], callStart: number | null) {
  const turnLatenciesSec: number[] = [];
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].role === "agent" && turns[i - 1].role === "caller") {
      const d = turns[i].t - turns[i - 1].t;
      if (d >= 0) turnLatenciesSec.push(Math.round(d * 1000) / 1000);
    }
  }
  const firstAgent = turns.find((t) => t.role === "agent");
  const firstResponseSec = firstAgent && callStart ? Math.max(0, Math.round((firstAgent.t - callStart) * 1000) / 1000) : null;
  return { firstResponseSec, turnLatenciesSec };
}

export function runMetrics(cases: TestCase[], findings: Finding[]): RunMetrics {
  const passed = cases.filter((c) => c.status === "passed").length;
  const failed = cases.filter((c) => c.status === "failed").length;
  const eligible = passed + failed;
  const taskOk = cases.filter((c) => {
    const e = c.evaluation;
    if (!e || e.verdict === "insufficient_data") return false;
    const rulesOk = !e.checks.some((k) => k.id.startsWith("required") && k.status === "fail");
    return rulesOk && e.judge.taskCompleted !== "no";
  }).length;
  const all = cases.flatMap((c) => c.latency?.turnLatenciesSec ?? []);
  const first = cases.map((c) => c.latency?.firstResponseSec).filter((v): v is number => v != null);
  const failureCategories: Record<string, number> = {};
  for (const f of findings) failureCategories[f.category] = (failureCategories[f.category] ?? 0) + 1;
  return {
    total: cases.length,
    passed,
    failed,
    insufficient: cases.filter((c) => c.status === "insufficient_data").length,
    errors: cases.filter((c) => c.status === "error").length,
    passRate: eligible ? passed / eligible : null,
    taskCompletion: eligible ? taskOk / eligible : null,
    latency: {
      n: all.length,
      p50: percentile(all, 50),
      p95: all.length >= MIN_P95_SAMPLES ? percentile(all, 95) : null,
      firstResponseP50: percentile(first, 50),
    },
    failureCategories,
  };
}

export type CompareOutcome = "fixed" | "regressed" | "still_failing" | "still_passing" | "not_comparable";

/** Matches cases on scenario + version + persona + sample so only identical test cases are compared. */
export function compareRuns(baseline: TestCase[], current: TestCase[]) {
  const key = (c: TestCase) => `${c.scenarioId}@${c.scenarioVersion}|${c.personaId}|${c.sample}`;
  const base = new Map(baseline.map((c) => [key(c), c]));
  return current.map((c) => {
    const b = base.get(key(c));
    const ok = (x?: TestCase) => (x?.status === "passed" ? true : x?.status === "failed" ? false : null);
    const [was, now] = [ok(b), ok(c)];
    let outcome: CompareOutcome = "not_comparable";
    if (was != null && now != null) {
      outcome = was && now ? "still_passing" : !was && now ? "fixed" : was && !now ? "regressed" : "still_failing";
    }
    return { caseId: c.id, baselineCaseId: b?.id, outcome };
  });
}
