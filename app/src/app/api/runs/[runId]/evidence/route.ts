import { after } from "next/server";
import { EvidenceInput, firstError } from "@/lib/schemas";
import { rateLimit, requireSession } from "@/lib/security";
import { advanceRun, importEvidence } from "@/lib/service";

export async function POST(req: Request, ctx: RouteContext<"/api/runs/[runId]/evidence">) {
  await requireSession();
  rateLimit("evidence.import", 30);
  const raw = await req.text();
  if (raw.length > 500_000) return Response.json({ error: "Evidence batch is too large" }, { status: 413 });
  let parsed;
  try { parsed = EvidenceInput.safeParse(JSON.parse(raw)); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  const { runId } = await ctx.params;
  try { await importEvidence(runId, parsed.data); }
  catch (e) { return Response.json({ error: (e as Error).message }, { status: 400 }); }
  after(() => advanceRun(runId));
  return Response.json({ imported: parsed.data.length }, { status: 202 });
}
