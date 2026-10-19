import Link from "next/link";
import { notFound } from "next/navigation";
import { RunPoller, Submit } from "@/components/client";
import { Card, Chip, Empty, PageHeader, SeverityChip, Stat, Table, btnPrimary, btnSecondary, pct, sec, td, when } from "@/components/ui";
import { cancelRunAction, retestAction, retryCasesAction } from "@/lib/actions";
import { readPage } from "@/lib/db";
import { MIN_P95_SAMPLES, compareRuns, runMetrics } from "@/lib/metrics";
import type { Severity } from "@/lib/types";

const SEVS: Severity[] = ["critical", "high", "medium", "low"];

export default async function RunPage({ params }: PageProps<"/runs/[runId]">) {
  const { runId } = await params;
  const db = await readPage();
  const run = db.runs.find((r) => r.id === runId);
  if (!run) notFound();
  const agent = db.agents.find((a) => a.id === run.agentId);
  const cases = db.cases.filter((c) => c.runId === runId);
  const findings = db.findings.filter((f) => f.runId === runId);
  const active = run.status === "queued" || run.status === "running";
  const m = run.metrics ?? runMetrics(cases, findings);
  const finished = cases.filter((c) => !["queued", "calling", "evaluating"].includes(c.status)).length;
  const current = cases.find((c) => c.status === "calling" || c.status === "evaluating");
  const scen = (id: string) => run.snapshot.scenarios.find((s) => s.id === id);
  const pers = (id: string) => run.snapshot.personas.find((p) => p.id === id);
  const baseline = run.baselineRunId ? db.runs.find((r) => r.id === run.baselineRunId) : undefined;
  const comparison = baseline ? compareRuns(db.cases.filter((c) => c.runId === baseline.id), cases) : null;
  const cmpCount = (o: string) => comparison?.filter((c) => c.outcome === o).length ?? 0;
  const retryable = cases.some((c) => ["failed", "error", "insufficient_data"].includes(c.status));

  return (
    <>
      <PageHeader
        title={run.snapshot.agentName}
        crumbs={[{ href: "/runs", label: "Runs" }]}
        actions={
          <>
            {active && (
              <form action={cancelRunAction.bind(null, run.id)}><Submit className={btnSecondary}>Cancel run</Submit></form>
            )}
            {!active && retryable && (
              <form action={retryCasesAction.bind(null, run.id)}><Submit className={btnSecondary}>Retry failed cases</Submit></form>
            )}
            {!active && (
              <form action={retestAction.bind(null, run.id, undefined)}><Submit className={btnPrimary}>Re-test (compare to this run)</Submit></form>
            )}
          </>
        }
      >
        <span className="flex flex-wrap items-center gap-2">
          <Chip value={run.status} /> {run.simulated && <Chip value="simulated" label="Simulated data" />}
          <span>Started {when(run.startedAt ?? run.createdAt)}</span>
          <RunPoller runId={run.id} active={active} />
        </span>
      </PageHeader>

      {run.error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{run.error}</p>}

      <Card className="mb-4">
        <div className="mb-2 flex justify-between text-sm">
          <span>{finished} of {cases.length} cases finished</span>
          <span className="text-muted">{m.errors ? `${m.errors} error(s)` : ""}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={finished} aria-valuemin={0} aria-valuemax={cases.length}>
          <div className="h-full bg-accent transition-all" style={{ width: `${cases.length ? (finished / cases.length) * 100 : 0}%` }} />
        </div>
        {current && (
          <p className="mt-3 text-sm">
            {current.status === "calling" ? (
              run.simulated ? "Simulating conversation" : <>📞 Gnani is calling <b>{agent?.countryCode} ••••{agent?.phone.slice(-4)}</b>. Tester: follow the script for </>
            ) : "Evaluating "}
            <Link href={`/runs/${run.id}/cases/${current.id}`} className="text-accent underline">
              {scen(current.scenarioId)?.title} · {pers(current.personaId)?.name}
            </Link>
          </p>
        )}
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Summary" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Pass rate" value={pct(m.passRate)} hint={`${m.passed} pass / ${m.failed} fail`} />
            <Stat label="Task completion" value={pct(m.taskCompletion)} hint={`${m.passed + m.failed} evaluated`} />
            <Stat label="Turn latency p50" value={sec(m.latency.p50)} hint={`n=${m.latency.n} turns`} />
            <Stat label="Turn latency p95" value={sec(m.latency.p95)} hint={m.latency.p95 == null ? `needs ≥${MIN_P95_SAMPLES} turns` : `n=${m.latency.n}`} />
          </div>
          <p className="mt-4 text-xs text-muted">
            First response p50 {sec(m.latency.firstResponseP50)} · {m.insufficient} case(s) with insufficient data excluded from rates.
            {m.passed + m.failed < 5 && " Small sample: treat rates as indicative, not statistically meaningful."}
          </p>
        </Card>
        <Card title="Failure categories">
          {Object.keys(m.failureCategories).length ? (
            <ul className="space-y-1.5 text-sm">
              {Object.entries(m.failureCategories).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <li key={k} className="flex justify-between"><span>{k.replaceAll("_", " ")}</span><span className="tabular-nums text-muted">{v}</span></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{active ? "None yet." : "No failures."}</p>
          )}
        </Card>
      </div>

      {baseline && comparison && (
        <Card title="Compared with baseline" className="mb-4" actions={<Link href={`/runs/${baseline.id}`} className="text-xs text-accent underline">{when(baseline.createdAt)}</Link>}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Pass rate" value={pct(m.passRate)} hint={`was ${pct(baseline.metrics?.passRate)}`} />
            <Stat label="Fixed" value={<span className="text-emerald-700">{cmpCount("fixed")}</span>} />
            <Stat label="Regressed" value={<span className="text-red-700">{cmpCount("regressed")}</span>} />
            <Stat label="Still failing" value={cmpCount("still_failing")} />
            <Stat label="Not comparable" value={cmpCount("not_comparable")} hint="changed version, no data, or pending" />
          </div>
        </Card>
      )}

      <h2 className="mb-3 mt-6 text-base font-semibold">Findings</h2>
      {findings.length ? (
        <div className="mb-6 space-y-4">
          {SEVS.filter((s) => findings.some((f) => f.severity === s)).map((s) => (
            <div key={s}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium"><SeverityChip s={s} /> {findings.filter((f) => f.severity === s).length}</h3>
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {findings.filter((f) => f.severity === s).map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <Link href={`/findings/${f.id}`} className="text-sm hover:text-accent">{f.title}</Link>
                    <span className="flex gap-1 text-xs text-muted">
                      {scen(f.scenarioId)?.title} · {f.source === "judge" ? "LLM judge" : "rule"} {f.disposition !== "open" && <Chip value={f.disposition} />}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-6 text-sm text-muted">{active ? "Findings appear as cases are evaluated." : "No findings in this run."}</p>
      )}

      <h2 className="mb-3 text-base font-semibold">Conversations</h2>
      {cases.length ? (
        <Table head={["Scenario", "Persona", "Status", "Score", "Max latency", "Disposition", baseline ? "vs baseline" : ""]}>
          {cases.map((c) => {
            const cmp = comparison?.find((x) => x.caseId === c.id);
            return (
              <tr key={c.id}>
                <td className={td}>
                  <Link href={`/runs/${run.id}/cases/${c.id}`} className="font-medium hover:text-accent">{scen(c.scenarioId)?.title}</Link>
                  {run.config.samples > 1 && <span className="text-xs text-muted"> #{c.sample + 1}</span>}
                  {c.error && <div className="mt-0.5 text-xs text-red-700">{c.error}</div>}
                </td>
                <td className={`${td} text-xs`}>{pers(c.personaId)?.name}</td>
                <td className={td}><Chip value={c.status} /></td>
                <td className={`${td} tabular-nums`}>{pct(c.evaluation?.score)}</td>
                <td className={`${td} tabular-nums`}>{c.latency?.turnLatenciesSec.length ? sec(Math.max(...c.latency.turnLatenciesSec)) : "—"}</td>
                <td className={`${td} font-mono text-xs`}>{c.call?.disposition ?? "—"}</td>
                <td className={td}>{cmp && cmp.outcome !== "not_comparable" && <Chip value={cmp.outcome === "fixed" ? "fixed" : cmp.outcome === "regressed" ? "regressed" : "queued"} label={cmp.outcome.replace("_", " ")} />}</td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <Empty title="No cases" />
      )}
    </>
  );
}
