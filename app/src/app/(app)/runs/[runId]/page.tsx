import Link from "next/link";
import { notFound } from "next/navigation";
import { RunPoller, Submit } from "@/components/client";
import { Avatar, Card, Chip, Count, Donut, Empty, Hero, LatencyHistogram, PageHeader, SeverityChip, Stat, Table, TestMatrix, groupFindings, btnPrimary, btnSecondary, pct, sec, td, when } from "@/components/ui";
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

      {run.error && <p role="alert" className="mb-4 rounded-md border border-fail/30 bg-fail/10 px-3 py-2 text-sm text-fail">{run.error}</p>}

      <Hero>
        <div className="flex flex-wrap items-center gap-8">
          <Donut value={m.passRate} size={128} sub={`${m.passed} pass, ${m.failed} fail`} />
          <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
            <Stat label="Task completion" value={pct(m.taskCompletion)} hint={`${m.passed + m.failed} evaluated`} />
            <Stat label="Reply time p50" value={sec(m.latency.p50)} hint={`${m.latency.n} replies`} />
            <Stat label="Reply time p95" value={sec(m.latency.p95)} hint={m.latency.p95 == null ? `needs ${MIN_P95_SAMPLES}+ replies` : `${m.latency.n} replies`} />
            <Stat label="First response p50" value={sec(m.latency.firstResponseP50)} />
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-[13px]">
            <span className="font-medium">{finished} of {cases.length} calls finished</span>
            <span className="text-muted">
              {m.errors ? `${m.errors} error(s). ` : ""}{m.insufficient ? `${m.insufficient} without enough data. ` : ""}
              {m.passed + m.failed < 5 && "Small sample: rates are indicative."}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={finished} aria-valuemin={0} aria-valuemax={cases.length}>
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-fg transition-all duration-700" style={{ width: `${cases.length ? (finished / cases.length) * 100 : 0}%` }} />
          </div>
          {current && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60 motion-reduce:hidden" /><span className="relative h-2.5 w-2.5 rounded-full bg-accent" /></span>
              {current.status === "calling" ? (
                run.simulated ? "Simulating" : <>Gnani is calling <b>{agent?.countryCode} ••••{agent?.phone.slice(-4)}</b>. Tester, follow the script for</>
              ) : "Evaluating"}
              <Link href={`/runs/${run.id}/cases/${current.id}`} className="font-medium text-accent-fg hover:underline">
                {scen(current.scenarioId)?.title}, {pers(current.personaId)?.name}
              </Link>
            </p>
          )}
        </div>
      </Hero>

      <Card title="Test matrix" className="mb-5" actions={<span className="text-[13px] text-muted">scenarios down, personas across. Click a square to open the call.</span>}>
        <TestMatrix runId={run.id} scenarios={run.snapshot.scenarios} personas={run.snapshot.personas} cases={cases} />
      </Card>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <Card title="Reply time distribution">
            <LatencyHistogram values={cases.flatMap((c) => c.latency?.turnLatenciesSec ?? [])} limit={Math.min(...run.snapshot.scenarios.map((sc) => sc.maxTurnLatencySec))} height={130} />
          </Card>
          <Card title="Failure categories">
            {Object.keys(m.failureCategories).length ? (
              <ul className="space-y-2.5 text-sm">
                {Object.entries(m.failureCategories).sort((a, b) => b[1] - a[1]).map(([k, v], _, all) => (
                  <li key={k}>
                    <div className="mb-1 flex justify-between"><span className="capitalize">{k.replaceAll("_", " ")}</span><span className="tabular-nums text-muted">{v}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-fail/70" style={{ width: `${(v / all[0][1]) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{active ? "None yet." : "No failures."}</p>
            )}
          </Card>
      </div>

      {baseline && comparison && (
        <Card title="Compared with baseline" className="mb-4" actions={<Link href={`/runs/${baseline.id}`} className="text-xs text-accent-fg hover:underline">{when(baseline.createdAt)}</Link>}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Pass rate" value={pct(m.passRate)} hint={`was ${pct(baseline.metrics?.passRate)}`} />
            <Stat label="Fixed" value={<span className="text-pass">{cmpCount("fixed")}</span>} />
            <Stat label="Regressed" value={<span className="text-fail">{cmpCount("regressed")}</span>} />
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
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium"><SeverityChip s={s} /> <span className="text-muted">{findings.filter((f) => f.severity === s).length} across calls</span></h3>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {groupFindings(findings.filter((f) => f.severity === s)).map(({ f, count }) => (
                  <li key={f.id}>
                    <Link href={`/findings/${f.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-canvas/70">
                      <span className="flex items-center gap-2 text-sm font-medium">{f.title} <Count n={count} /></span>
                      <span className="flex items-center gap-2 text-xs text-muted">
                        {scen(f.scenarioId)?.title}, found by {f.source === "judge" ? "LLM judge" : "rule"} {f.disposition !== "open" && <Chip value={f.disposition} />}
                      </span>
                    </Link>
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
                  {c.error && <div className="mt-0.5 text-xs text-fail">{c.error}</div>}
                </td>
                <td className={`${td} text-xs`}><span className="flex items-center gap-2"><Avatar id={c.personaId} name={pers(c.personaId)?.name ?? "?"} size={22} />{pers(c.personaId)?.name}</span></td>
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
