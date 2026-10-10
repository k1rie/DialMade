// «Duplicar»: a copy of one of the signed-in user's designs, under a new name.
import { designsUnavailable, getDesignsHandlers } from "@/lib/designs/server";

export async function POST(request: Request, ctx: RouteContext<"/api/designs/[id]/duplicate">) {
  const handlers = getDesignsHandlers();
  return handlers ? handlers.duplicate(request, (await ctx.params).id) : designsUnavailable();
}
