import { adapters } from "@/lib/adapters";
import { read } from "@/lib/db";
import { decrypt, requireSession } from "@/lib/security";

/** Streams the Gnani recording through the server so the API key never reaches the browser. */
export async function GET(_: Request, ctx: RouteContext<"/api/cases/[caseId]/audio">) {
  await requireSession();
  const { caseId } = await ctx.params;
  const db = await read();
  const c = db.cases.find((x) => x.id === caseId);
  const run = c && db.runs.find((r) => r.id === c.runId);
  const agent = run && db.agents.find((a) => a.id === run.agentId);
  const getAudio = agent && adapters[agent.provider].getAudio;
  if (!c?.call?.conversationId || !agent?.secret || !getAudio) return new Response("Audio not available", { status: 404 });
  const res = await getAudio(agent, decrypt(agent.secret), c.call.conversationId).catch(() => null);
  if (!res?.ok || !res.body) return new Response("Audio not available from Gnani", { status: res?.status === 404 ? 404 : 502 });
  return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" } });
}
