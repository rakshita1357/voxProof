import { read, safeAgent } from "@/lib/db";
import { AgentInput, firstError } from "@/lib/schemas";
import { rateLimit, requireSession } from "@/lib/security";
import { createAgent, testConnection } from "@/lib/service";

export async function GET() {
  await requireSession();
  return Response.json({ agents: (await read()).agents.map(safeAgent) });
}

export async function POST(req: Request) {
  await requireSession();
  const parsed = AgentInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  try {
    rateLimit("agent.create", 10);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 429 });
  }
  const agentId = await createAgent(parsed.data);
  const check = await testConnection(agentId);
  return Response.json({ agentId, check }, { status: 201 });
}
