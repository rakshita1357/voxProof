import Link from "next/link";
import { notFound } from "next/navigation";
import { RunPoller } from "@/components/client";
import { Avatar, Card, Chip, PageHeader, SeverityChip, Stat, Waveform, pct, sec } from "@/components/ui";
import { readPage } from "@/lib/db";

export default async function CasePage({ params }: PageProps<"/runs/[runId]/cases/[caseId]">) {
  const { runId, caseId } = await params;
  const db = await readPage();
  const run = db.runs.find((r) => r.id === runId);
  const c = db.cases.find((x) => x.id === caseId && x.runId === runId);
  if (!run || !c) notFound();
  const s = run.snapshot.scenarios.find((x) => x.id === c.scenarioId)!;
  const p = run.snapshot.personas.find((x) => x.id === c.personaId)!;
  const findings = db.findings.filter((f) => f.caseId === c.id);
  const turns = c.transcript ?? [];
  const t0 = c.call?.startTime ?? turns[0]?.t ?? 0;
  const pending = ["queued", "calling", "evaluating"].includes(c.status);
  const e = c.evaluation;

  return (
    <>
      <PageHeader
        title={`${s.title} · ${p.name}`}
        crumbs={[{ href: "/runs", label: "Runs" }, { href: `/runs/${run.id}`, label: run.snapshot.agentName }]}
      >
        <span className="flex flex-wrap items-center gap-2">
          <Chip value={c.status} /> {run.simulated && <Chip value="simulated" label="Simulated data" />}
          <span>Scenario v{c.scenarioVersion} · seed {c.seed}</span>
          <RunPoller runId={run.id} active={pending && (run.status === "running" || run.status === "queued")} />
        </span>
      </PageHeader>

      {c.error && <p role="alert" className="mb-4 rounded-md border border-fail/30 bg-fail/10 px-3 py-2 text-sm text-fail">{c.error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {c.call && !run.simulated && (
            <Card title="Recording">
              <div className="mb-3 h-10 text-accent/30"><Waveform bars={96} /></div>
              <audio controls preload="none" src={`/api/cases/${c.id}/audio`} className="w-full">
                Your browser cannot play this recording.
              </audio>
              <p className="mt-2 text-xs text-muted">Streamed from Gnani via VoxProof. If it does not play, Gnani has no recording for this conversation yet.</p>
            </Card>
          )}
          {run.simulated && <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-fg">Simulated conversation: no audio exists.</p>}

          <Card title="Transcript and timeline">
            {turns.length ? (
              <ol className="space-y-4">
                {turns.map((t, i) => {
                  const lat = t.role === "agent" && turns[i - 1]?.role === "caller" ? t.t - turns[i - 1].t : null;
                  const slow = lat != null && lat > s.maxTurnLatencySec;
                  const agent = t.role === "agent";
                  return (
                    <li key={i} id={`turn-${i + 1}`} className="grid grid-cols-[3.5rem_1fr] gap-3 scroll-mt-6 target:[&>div]:ring-2 target:[&>div]:ring-accent/40">
                      <time className="pt-2 text-right font-mono text-xs text-muted">{fmtTime(t.t - t0)}</time>
                      <div className={`rounded-xl ${agent ? "" : "ml-6 sm:ml-16"}`}>
                        {lat != null && (
                          <div className="mb-1.5 flex items-center gap-2" aria-label={`Agent replied after ${lat.toFixed(2)} seconds`}>
                            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-line">
                              <div className={`h-full rounded-full ${slow ? "bg-fail" : "bg-pass"}`} style={{ width: `${Math.min(100, (lat / (s.maxTurnLatencySec * 2)) * 100)}%` }} />
                            </div>
                            <span className={`text-xs ${slow ? "font-medium text-fail" : "text-muted"}`}>{lat.toFixed(2)}s{slow && ` (limit ${s.maxTurnLatencySec}s)`}</span>
                          </div>
                        )}
                        <div className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${agent ? "border border-line bg-surface-2" : "border border-accent/20 bg-accent-soft"}`}>
                          <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                            {!agent && <Avatar id={p.id} name={p.name} size={18} />}
                            <span className={`font-medium ${agent ? "text-ink" : "text-accent"}`}>{agent ? "Agent" : p.name}</span>
                            <span>Turn {i + 1}</span>
                            {t.language && <span>{t.language}</span>}
                            {t.interrupted && <span className="text-warn">Interrupted the agent</span>}
                          </div>
                          {t.text}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted">{pending ? "Waiting for the conversation to finish and Gnani to publish the transcript…" : "No transcript was collected."}</p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Caller script (for the tester)" actions={<Avatar id={p.id} name={p.name} />}>
            <p className="mb-2 text-xs text-muted">{p.instructions}</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">{s.callerScript.map((l, i) => <li key={i}>{l}</li>)}</ol>
          </Card>
          <Card title="Expected vs actual">
            <dl className="space-y-2 text-sm">
              <dt className="text-xs text-muted">Expected</dt>
              <dd>{s.expectedOutcome}</dd>
              <dt className="text-xs text-muted">Actual</dt>
              <dd>{e?.judge.explanation ?? (pending ? "Pending" : "—")}</dd>
            </dl>
          </Card>
          <Card title="Metrics">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Score" value={pct(e?.score)} />
              <Stat label="First response" value={sec(c.latency?.firstResponseSec)} />
              <Stat label="Max turn latency" value={c.latency?.turnLatenciesSec.length ? sec(Math.max(...c.latency.turnLatenciesSec)) : "—"} hint={`n=${c.latency?.turnLatenciesSec.length ?? 0}`} />
              <Stat label="Gnani avg latency" value={sec(c.call?.avgAgentLatencySec)} hint={c.call && c.call.avgAgentLatencySec == null ? "not reported" : undefined} />
            </div>
            {c.call && (
              <p className="mt-3 text-xs text-muted">
                Call {c.call.status} · {c.call.durationSec ?? "?"}s · disposition {c.call.disposition ?? "none"} · id <span className="font-mono">{c.call.conversationId}</span>
                {c.call.matchedBy === "time-window" && " · matched to this case by time window (name not found in logs)"}
              </p>
            )}
          </Card>
        </div>
      </div>

      {e && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Deterministic checks">
            <ul className="space-y-2 text-sm">
              {e.checks.map((k) => (
                <li key={k.id}>
                  <div className="flex items-center gap-2"><Chip value={k.status} /> <span className="font-medium">{k.name}</span></div>
                  <div className="ml-1 mt-0.5 text-xs text-muted">{k.detail}</div>
                  {k.evidence?.map((ev) => (
                    <a key={ev.turn} href={`#turn-${ev.turn + 1}`} className="ml-1 block text-xs text-accent-fg hover:underline">Turn {ev.turn + 1}: “{ev.quote}”</a>
                  ))}
                </li>
              ))}
            </ul>
          </Card>
          <Card title={`LLM judge (${e.rubricVersion})`}>
            <div className="mb-2 flex items-center gap-2 text-sm"><Chip value={e.judge.status === "scored" ? "pass" : "queued"} label={e.judge.status.replace("_", " ")} /> {e.judge.model && <span className="text-xs text-muted">{e.judge.model}</span>}</div>
            {e.judge.scores && (
              <ul className="mb-2 grid grid-cols-2 gap-1 text-sm">
                {Object.entries(e.judge.scores).map(([k, v]) => <li key={k}>{k.replaceAll("_", " ")}: <b>{v == null ? "n/a" : pct(v)}</b></li>)}
                <li>task completed: <b>{e.judge.taskCompleted}</b></li>
              </ul>
            )}
            <p className="text-sm text-muted">{e.judge.explanation}</p>
            <p className="mt-2 text-xs text-muted">The judge is an aid, not ground truth. Check the evidence before acting.</p>
          </Card>
        </div>
      )}

      {findings.length > 0 && (
        <Card title="Findings" className="mt-4">
          <ul className="space-y-2">
            {findings.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm">
                <SeverityChip s={f.severity} />
                <Link href={`/findings/${f.id}`} className="hover:text-accent">{f.title}</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

const fmtTime = (secs: number) => `${String(Math.floor(secs / 60)).padStart(2, "0")}:${(secs % 60).toFixed(1).padStart(4, "0")}`;
