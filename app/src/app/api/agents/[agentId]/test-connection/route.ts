import { rateLimit, requireSession } from "@/lib/security";
import { testConnection } from "@/lib/service";

export async function POST(_: Request, ctx: RouteContext<"/api/agents/[agentId]/test-connection">) {
  await requireSession();
  const { agentId } = await ctx.params;
  try {
    rateLimit("agent.test", 20);
    return Response.json(await testConnection(agentId));
  } catch (e) {
    const msg = (e as Error).message;
    return Response.json({ error: msg }, { status: msg === "Agent not found" ? 404 : 429 });
  }
}
