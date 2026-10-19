import Link from "next/link";
import { notFound } from "next/navigation";
import { RunPoller } from "@/components/client";
import { Card, Chip, PageHeader, SeverityChip, Stat, pct, sec } from "@/components/ui";
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

      {c.error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{c.error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {c.call && !run.simulated && (
            <Card title="Recording">
              <audio controls preload="none" src={`/api/cases/${c.id}/audio`} className="w-full">
                Your browser cannot play this recording.
              </audio>
              <p className="mt-2 text-xs text-muted">Streamed from Gnani via VoxProof. If it does not play, Gnani has no recording for this conversation yet.</p>
            </Card>
          )}
          {run.simulated && <p className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">Simulated conversation: no audio exists.</p>}

          <Card title="Transcript and timeline">
            {turns.length ? (
              <ol className="space-y-3">
                {turns.map((t, i) => {
                  const lat = t.role === "agent" && turns[i - 1]?.role === "caller" ? t.t - turns[i - 1].t : null;
                  const slow = lat != null && lat > s.maxTurnLatencySec;
                  return (
                    <li key={i} id={`turn-${i + 1}`} className={`flex gap-3 ${t.role === "caller" ? "flex-row-reverse text-right" : ""}`}>
                      <div className="w-14 shrink-0 pt-1 font-mono text-xs text-muted">{(t.t - t0).toFixed(1)}s</div>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${t.role === "agent" ? "bg-canvas" : "bg-accent-soft"}`}>
                        <div className="mb-0.5 text-xs text-muted">
                          {i + 1}. {t.role === "agent" ? "Agent" : "Caller"}
                          {t.language && ` · ${t.language}`}
                          {t.interrupted && " · interrupted agent"}
                          {lat != null && <span className={slow ? " font-medium text-red-700" : ""}> · responded in {lat.toFixed(2)}s</span>}
                        </div>
                        {t.text}
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
          <Card title="Caller script (for the tester)">
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
                    <a key={ev.turn} href={`#turn-${ev.turn + 1}`} className="ml-1 block text-xs text-accent underline">Turn {ev.turn + 1}: “{ev.quote}”</a>
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
