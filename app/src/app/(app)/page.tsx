import { PhoneCall, Plus } from "lucide-react";
import Link from "next/link";
import { Avatar, Card, Chip, Count, Donut, Empty, Hero, LatencyHistogram, PageHeader, Stat, TestMatrix, groupFindings, btnPrimary, pct, sec, when } from "@/components/ui";
import { readPage } from "@/lib/db";

const SEV = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const SEV_BAR = { critical: "bg-fail", high: "bg-warn", medium: "bg-caution", low: "bg-muted/40" } as const;

const ACTIVITY: Record<string, string> = {
  "agent.created": "Agent connected",
  "agent.connection_checked": "Connection checked",
  "run.created": "Run launched",
  "run.completed": "Run finished",
  "run.cancelled": "Run cancelled",
  "run.cases_retried": "Failed cases retried",
  "call.triggered": "Test call placed",
  "finding.disposition": "Finding status changed",
  "scenario.created": "Scenario created",
  "scenario.updated": "Scenario updated",
  "scenario.regression_created": "Regression test created",
};

export default async function Overview() {
  const db = await readPage();
  const latest = db.runs[0];
  const done = db.runs.filter((r) => r.status === "completed" && r.metrics?.passRate != null).slice(0, 12).reverse();
  const findings = groupFindings(
    db.findings
      .filter((f) => f.disposition === "open" && (f.severity === "critical" || f.severity === "high"))
      .sort((a, b) => SEV[a.severity] - SEV[b.severity] || b.createdAt.localeCompare(a.createdAt)),
  ).slice(0, 6);
  // Collapse bursts like "Test call placed" x6 into one line.
  const activity = db.audit.slice(0, 40).reduce<{ action: string; at: string; id: string; n: number }[]>((acc, e) => {
    const last = acc.at(-1);
    if (last?.action === e.action) last.n++;
    else acc.push({ action: e.action, at: e.at, id: e.id, n: 1 });
    return acc;
  }, []).slice(0, 7);

  if (!db.agents.length)
    return (
      <>
        <PageHeader title="Welcome to VoxProof">Three steps to your first scored test call.</PageHeader>
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["Connect a Gnani agent", "Add the botId, an API key and a tester number Gnani has whitelisted. No account yet? Use a simulated agent."],
            ["Pick scenarios and personas", "Start with the built-in library: promise to pay, wrong number, callback, and four caller personas."],
            ["Launch and review", "Watch calls complete, open any failure for the exact turns, and get the change to make in Gnani."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-xl border border-line bg-surface p-5">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">{i + 1}</span>
              <h2 className="mt-4 font-semibold">{t}</h2>
              <p className="mt-1.5 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
        <Link href="/agents/new" className={`${btnPrimary} mt-6`}><PhoneCall size={16} aria-hidden /> Connect agent</Link>
      </>
    );

  const latestCases = latest ? db.cases.filter((c) => c.runId === latest.id) : [];
  const m = latest?.metrics;
  const personaName = (pid: string) => db.personas.find((p) => p.id === pid)?.name ?? "Persona";
  const latestLimit = latest ? Math.min(...latest.snapshot.scenarios.map((sc) => sc.maxTurnLatencySec)) : 2.5;

  return (
    <>
      <PageHeader title="Overview" actions={<Link href="/runs/new" className={btnPrimary}><Plus size={16} aria-hidden /> New test run</Link>} />

      {latest ? (
        <Hero>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-accent">Latest run</span>
                <Chip value={latest.status} />
                {latest.simulated && <Chip value="simulated" />}
              </div>
              <Link href={`/runs/${latest.id}`} className="mt-2 block truncate text-2xl font-semibold tracking-[-0.02em] hover:text-accent">
                {latest.snapshot.agentName}
              </Link>
              <div className="text-[13px] text-muted">{when(latest.createdAt)}</div>
              <div className="mt-6 flex flex-wrap items-center gap-8">
                <Donut value={m?.passRate ?? null} sub={m ? `${m.passed} of ${m.passed + m.failed} calls` : "in progress"} />
                <div className="grid grid-cols-2 gap-x-10 gap-y-5">
                  <Stat label="Task completion" value={pct(m?.taskCompletion)} />
                  <Stat label="Median reply time" value={sec(m?.latency.p50)} hint={m ? `${m.latency.n} replies measured` : undefined} />
                  <Stat label="Findings" value={db.findings.filter((f) => f.runId === latest.id).length} />
                  <Stat label="Calls" value={latestCases.length} />
                </div>
              </div>
            </div>
            <div className="min-w-0 rounded-xl border border-line bg-surface-2 p-4 lg:self-start">
              <div className="mb-3 text-[13px] font-medium">Every call in this run</div>
              <TestMatrix runId={latest.id} scenarios={latest.snapshot.scenarios} personas={latest.snapshot.personas} cases={latestCases} compact />
            </div>
          </div>
        </Hero>
      ) : (
        <Empty title="No runs yet" icon={<PhoneCall size={20} />} action={<Link href="/runs/new" className={btnPrimary}>New test run</Link>}>
          Your agent is connected. Launch a run to place the first test calls.
        </Empty>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title="Reply time distribution" className="lg:col-span-2" actions={<span className="text-[13px] text-muted">latest run</span>}>
          <LatencyHistogram values={latestCases.flatMap((c) => c.latency?.turnLatenciesSec ?? [])} limit={latestLimit} />
        </Card>
        <Card title="Pass rate over time" className="lg:col-span-3">
          {done.length < 2 ? (
            <p className="text-sm text-muted">The trend appears after two completed runs. You have {done.length}.</p>
          ) : (
            <Trend points={done.map((r) => ({ v: r.metrics!.passRate!, id: r.id, label: when(r.createdAt) }))} />
          )}
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Card title="Recent activity" className="lg:col-span-2 lg:order-2">
          <ol className="relative space-y-3.5 border-l border-line pl-4 text-sm">
            {activity.map((e) => (
              <li key={e.id} className="relative">
                <span aria-hidden className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent/70" />
                <div className="flex justify-between gap-3">
                  <span className="truncate">{ACTIVITY[e.action] ?? e.action}{e.n > 1 && <span className="text-muted"> ({e.n})</span>}</span>
                  <time className="shrink-0 text-xs text-muted">{new Date(e.at).toLocaleTimeString("en-IN", { timeStyle: "short" })}</time>
                </div>
              </li>
            ))}
            {!activity.length && <li className="text-muted">Nothing yet.</li>}
          </ol>
        </Card>
      <Card title="Open critical and high findings" className="lg:col-span-3 lg:order-1" flush actions={findings.length ? <span className="text-[13px] text-muted">{findings.length} shown</span> : undefined}>
        {findings.length ? (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {findings.map(({ f, count }) => (
              <li key={f.id}>
                <Link href={`/findings/${f.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-canvas/70">
                  <span aria-hidden className={`h-8 w-1 shrink-0 rounded-full ${SEV_BAR[f.severity]}`} />
                  <Avatar id={f.personaId} name={personaName(f.personaId)} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{f.title}</span>
                    <span className="block truncate text-[13px] text-muted">{f.recommendation}</span>
                  </span>
                  <Count n={count} />
                  <Chip value={f.severity} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 pb-5 pt-2 text-sm text-muted">Nothing critical or high is open.</p>
        )}
      </Card>
      </div>
    </>
  );
}

function Trend({ points }: { points: { v: number; id: string; label: string }[] }) {
  const w = 600, h = 170, pad = 28;
  const x = (i: number) => pad + (i * (w - pad - 12)) / (points.length - 1);
  const y = (v: number) => h - 20 - v * (h - 36);
  const line = points.map((p, i) => `${x(i)},${y(p.v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-44 w-full" role="img" aria-label={`Pass rate over the last ${points.length} runs, latest ${pct(points.at(-1)!.v)}`}>
      <defs>
        <linearGradient id="vp-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - 12} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeDasharray={g ? "3 4" : undefined} />
          <text x={0} y={y(g) + 4} fontSize="11" fill="var(--muted)">{g * 100}%</text>
        </g>
      ))}
      <polygon points={`${x(0)},${y(0)} ${line} ${x(points.length - 1)},${y(0)}`} fill="url(#vp-area)" />
      <polyline fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={line} />
      {points.map((p, i) => (
        <a key={p.id} href={`/runs/${p.id}`}>
          <circle cx={x(i)} cy={y(p.v)} r={i === points.length - 1 ? 5 : 3.5} fill={i === points.length - 1 ? "var(--accent)" : "var(--surface)"} stroke="var(--accent)" strokeWidth="2">
            <title>{`${p.label}: ${pct(p.v)}`}</title>
          </circle>
        </a>
      ))}
    </svg>
  );
}
