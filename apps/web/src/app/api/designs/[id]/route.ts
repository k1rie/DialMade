// One design of the signed-in user: GET (with its document), PATCH (name and/or document), DELETE.
import { connection } from "next/server";
import { designsUnavailable, getDesignsHandlers } from "@/lib/designs/server";

export async function GET(request: Request, ctx: RouteContext<"/api/designs/[id]">) {
  await connection();
  const handlers = getDesignsHandlers();
  return handlers ? handlers.get(request, (await ctx.params).id) : designsUnavailable();
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/designs/[id]">) {
  const handlers = getDesignsHandlers();
  return handlers ? handlers.update(request, (await ctx.params).id) : designsUnavailable();
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/designs/[id]">) {
  const handlers = getDesignsHandlers();
  return handlers ? handlers.remove(request, (await ctx.params).id) : designsUnavailable();
}
