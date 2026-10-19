import { requireSession } from "@/lib/security";
import { cancelRun } from "@/lib/service";

export async function POST(_: Request, ctx: RouteContext<"/api/runs/[runId]/cancel">) {
  await requireSession();
  const { runId } = await ctx.params;
  await cancelRun(runId);
  return Response.json({ runId, status: "cancelled", note: "Calls already placed cannot be ended through the Gnani API." });
}
