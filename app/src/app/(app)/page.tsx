import Link from "next/link";
import { Card, Chip, Empty, PageHeader, SeverityChip, Stat, btnPrimary, pct, sec, when } from "@/components/ui";
import { readPage } from "@/lib/db";

const SEV = { critical: 0, high: 1, medium: 2, low: 3 } as const;

export default async function Overview() {
  const db = await readPage();
  const latest = db.runs[0];
  const done = db.runs.filter((r) => r.status === "completed" && r.metrics?.passRate != null).slice(0, 12).reverse();
  const findings = db.findings
    .filter((f) => f.disposition === "open" && (f.severity === "critical" || f.severity === "high"))
    .sort((a, b) => SEV[a.severity] - SEV[b.severity] || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  if (!db.agents.length)
    return (
      <>
        <PageHeader title="Overview" />
        <Empty title="Connect your first Gnani agent" action={<Link href="/agents/new" className={btnPrimary}>Connect agent</Link>}>
          VoxProof places test calls through your Gnani Inya agent, then scores the transcript, timing and outcome. Or add a simulated agent to try the product without credentials.
        </Empty>
      </>
    );

  return (
    <>
      <PageHeader title="Overview" actions={<Link href="/runs/new" className={btnPrimary}>New test run</Link>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Latest run" className="lg:col-span-1">
          {latest ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Link href={`/runs/${latest.id}`} className="font-medium hover:text-accent">{latest.snapshot.agentName}</Link>
                <Chip value={latest.status} />
                {latest.simulated && <Chip value="simulated" />}
              </div>
              <div className="text-xs text-muted">{when(latest.createdAt)}</div>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Pass rate" value={pct(latest.metrics?.passRate)} hint={latest.metrics ? `${latest.metrics.passed}/${latest.metrics.passed + latest.metrics.failed} evaluated` : "in progress"} />
                <Stat label="Median turn latency" value={sec(latest.metrics?.latency.p50)} hint={latest.metrics ? `n=${latest.metrics.latency.n}` : undefined} />
              </div>
            </div>
          ) : (
            <Empty title="No runs yet" action={<Link href="/runs/new" className={btnPrimary}>Start a run</Link>} />
          )}
        </Card>
        <Card title="Pass-rate trend" className="lg:col-span-2">
          {done.length < 2 ? (
            <p className="text-sm text-muted">Trend appears after two completed runs ({done.length} so far).</p>
          ) : (
            <Trend points={done.map((r) => ({ v: r.metrics!.passRate!, id: r.id, label: when(r.createdAt) }))} />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Open high-severity findings" className="lg:col-span-2">
          {findings.length ? (
            <ul className="divide-y divide-line">
              {findings.map((f) => (
                <li key={f.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <SeverityChip s={f.severity} />
                  <Link href={`/findings/${f.id}`} className="text-sm hover:text-accent">{f.title}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No open critical or high findings.</p>
          )}
        </Card>
        <Card title="Recent activity">
          <ul className="space-y-2 text-sm">
            {db.audit.slice(0, 8).map((e) => (
              <li key={e.id} className="flex justify-between gap-2">
                <span className="truncate">{e.action.replace(".", " · ").replaceAll("_", " ")}</span>
                <span className="shrink-0 text-xs text-muted">{new Date(e.at).toLocaleTimeString("en-IN", { timeStyle: "short" })}</span>
              </li>
            ))}
            {!db.audit.length && <li className="text-muted">Nothing yet.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}

function Trend({ points }: { points: { v: number; id: string; label: string }[] }) {
  const w = 600, h = 140, pad = 16;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (points.length - 1);
  const y = (v: number) => h - pad - v * (h - 2 * pad);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" role="img" aria-label={`Pass rate over last ${points.length} runs, latest ${pct(points.at(-1)!.v)}`}>
      {[0, 0.5, 1].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="var(--line)" />
          <text x={0} y={y(g) + 4} fontSize="10" fill="var(--muted)">{g * 100}</text>
        </g>
      ))}
      <polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={points.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")} />
      {points.map((p, i) => (
        <a key={p.id} href={`/runs/${p.id}`}>
          <circle cx={x(i)} cy={y(p.v)} r="4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2">
            <title>{`${p.label}: ${pct(p.v)}`}</title>
          </circle>
        </a>
      ))}
    </svg>
  );
}
