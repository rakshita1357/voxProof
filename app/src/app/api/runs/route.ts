import { after } from "next/server";
import { read } from "@/lib/db";
import { RunInput, firstError } from "@/lib/schemas";
import { rateLimit, requireSession } from "@/lib/security";
import { advanceRun, createRun } from "@/lib/service";

export async function GET() {
  await requireSession();
  const runs = (await read()).runs.map(({ snapshot, ...r }) => ({ ...r, agentName: snapshot.agentName }));
  return Response.json({ runs });
}

export async function POST(req: Request) {
  await requireSession();
  const parsed = RunInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  try {
    rateLimit("run.create", 10);
    const runId = await createRun(parsed.data);
    after(() => advanceRun(runId));
    return Response.json({ runId, status: "queued" }, { status: 202 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
