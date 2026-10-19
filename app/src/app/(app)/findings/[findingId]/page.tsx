import Link from "next/link";
import { notFound } from "next/navigation";
import { Submit } from "@/components/client";
import { Card, Chip, PageHeader, SeverityChip, btnPrimary, btnSecondary, when } from "@/components/ui";
import { createRegressionTest, retestAction, setFindingDisposition } from "@/lib/actions";
import { readPage } from "@/lib/db";

export default async function FindingPage({ params }: PageProps<"/findings/[findingId]">) {
  const { findingId } = await params;
  const db = await readPage();
  const f = db.findings.find((x) => x.id === findingId);
  if (!f) notFound();
  const run = db.runs.find((r) => r.id === f.runId)!;
  const s = run.snapshot.scenarios.find((x) => x.id === f.scenarioId);
  const runActive = run.status === "queued" || run.status === "running";

  return (
    <>
      <PageHeader
        title={f.title}
        crumbs={[{ href: "/runs", label: "Runs" }, { href: `/runs/${run.id}`, label: run.snapshot.agentName }, { href: `/runs/${run.id}/cases/${f.caseId}`, label: "Conversation" }]}
        actions={
          <>
            <form action={createRegressionTest.bind(null, f.id)}><Submit className={btnSecondary}>Create regression test</Submit></form>
            {!runActive && (
              <form action={retestAction.bind(null, run.id, [f.scenarioId])}><Submit className={btnPrimary}>Re-test this scenario</Submit></form>
            )}
          </>
        }
      >
        <span className="flex flex-wrap items-center gap-2">
          <SeverityChip s={f.severity} /> <Chip value={f.category} /> {run.simulated && <Chip value="simulated" label="Simulated data" />}
          <span>{f.source === "judge" ? "Found by LLM judge" : "Found by deterministic rule"} · confidence {f.confidence} · {when(f.createdAt)}</span>
        </span>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Diagnosis">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="label">Observed</dt><dd>{f.observed}</dd></div>
              <div><dt className="label">Expected</dt><dd>{f.expected}</dd></div>
              <div className="sm:col-span-2"><dt className="label">Likely cause</dt><dd>{f.likelyCause}</dd></div>
            </dl>
          </Card>
          <Card title="Evidence">
            {f.evidence.length ? (
              <ul className="space-y-2 text-sm">
                {f.evidence.map((e) => (
                  <li key={e.turn}>
                    <Link href={`/runs/${run.id}/cases/${f.caseId}#turn-${e.turn + 1}`} className="text-xs text-accent-fg hover:underline">Turn {e.turn + 1}</Link>
                    <blockquote className="mt-1 border-l-2 border-line pl-3">“{e.quote}”</blockquote>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No transcript span was cited for this finding.</p>
            )}
          </Card>
          <Card title="Recommended change">
            <p className="whitespace-pre-wrap text-sm">{f.recommendation}</p>
            <p className="mt-3 text-xs text-muted">
              VoxProof does not modify your Gnani agent. Apply the change yourself, mark the finding fixed, then re-test{s ? ` “${s.title}”` : ""} to confirm and check for regressions.
              {f.confidence !== "high" && " Confidence is not high: verify against the transcript and recording first."}
            </p>
          </Card>
        </div>
        <Card title="Status">
          <form action={setFindingDisposition.bind(null, f.id)} className="space-y-2">
            {(["open", "fixed", "accepted_risk", "false_positive"] as const).map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input type="radio" name="disposition" value={d} defaultChecked={f.disposition === d} /> {d.replace("_", " ")}
              </label>
            ))}
            <Submit className={btnSecondary}>Save status</Submit>
          </form>
          {run.simulated && <p className="mt-3 text-xs text-muted">Simulated agents stop reproducing a fault once its finding is marked fixed, so you can try the re-test flow.</p>}
        </Card>
      </div>
    </>
  );
}
