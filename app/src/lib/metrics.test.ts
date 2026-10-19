// Run: node --test --experimental-strip-types src/lib/metrics.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { compareRuns, latencies, percentile, runMetrics } from "./metrics.ts";
import type { TestCase } from "./types.ts";

test("percentile uses nearest-rank", () => {
  assert.equal(percentile([], 50), null);
  assert.equal(percentile([3, 1, 2], 50), 2);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95), 10);
});

test("latencies only measure caller->agent transitions", () => {
  const r = latencies(
    [
      { role: "agent", text: "hi", t: 101 },
      { role: "caller", text: "a", t: 105 },
      { role: "agent", text: "b", t: 106.5 },
      { role: "agent", text: "c", t: 110 },
      { role: "caller", text: "d", t: 112 },
      { role: "agent", text: "e", t: 115 },
    ],
    100,
  );
  assert.deepEqual(r.turnLatenciesSec, [1.5, 3]);
  assert.equal(r.firstResponseSec, 1);
});

const tc = (id: string, status: TestCase["status"], sample = 0): TestCase => ({
  id,
  runId: "r",
  scenarioId: "s",
  scenarioVersion: 1,
  personaId: "p",
  sample,
  seed: 1,
  status,
  attempts: 0,
  updatedAt: "",
  latency: { firstResponseSec: null, turnLatenciesSec: [1, 2] },
});

test("runMetrics hides p95 below the sample floor and excludes insufficient data from pass rate", () => {
  const m = runMetrics([tc("a", "passed"), tc("b", "failed", 1), tc("c", "insufficient_data", 2)], []);
  assert.equal(m.passRate, 0.5);
  assert.equal(m.latency.n, 6);
  assert.equal(m.latency.p95, null);
});

test("compareRuns classifies fixed and regressed cases", () => {
  const out = compareRuns([tc("a", "failed"), tc("b", "passed", 1)], [tc("c", "passed"), tc("d", "failed", 1)]);
  assert.deepEqual(out.map((o) => o.outcome), ["fixed", "regressed"]);
});
