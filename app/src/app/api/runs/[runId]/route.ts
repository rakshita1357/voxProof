import { after } from "next/server";
import { read } from "@/lib/db";
import { requireSession } from "@/lib/security";
import { advanceRun } from "@/lib/service";

const PAGE = 50;

/** Returns run status and advances the run one step in the background (polling drives the pipeline). */
export async function GET(req: Request, ctx: RouteContext<"/api/runs/[runId]">) {
  await requireSession();
  const { runId } = await ctx.params;
  const db = await read();
  const run = db.runs.find((r) => r.id === runId);
  if (!run) return Response.json({ error: "Run not found" }, { status: 404 });
  if (run.status === "queued" || run.status === "running") after(() => advanceRun(runId));
  const cursor = Number(new URL(req.url).searchParams.get("cursor") ?? 0) || 0;
  const cases = db.cases.filter((c) => c.runId === runId);
  return Response.json({
    run: { ...run, snapshot: { ...run.snapshot, agentContext: undefined } },
    cases: cases.slice(cursor, cursor + PAGE).map((c) => ({ ...c, transcript: undefined })),
    findings: db.findings.filter((f) => f.runId === runId),
    nextCursor: cursor + PAGE < cases.length ? cursor + PAGE : null,
  });
}
