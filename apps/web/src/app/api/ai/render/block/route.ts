import { RenderBlockBodySchema } from "@/lib/ai/render/api";
import { parseRenderRequest } from "@/lib/ai/render/route";
import { renderBlock, renderJsonResponse } from "@/lib/ai/render/server";

export const maxDuration = 60;

/** «Otra versión» / «Pedir cambio» of one AI block: one action of the design session. JSON with the RAW root. */
export async function POST(request: Request): Promise<Response> {
  const parsed = await parseRenderRequest(request, RenderBlockBodySchema, "{ sessionId, brand, direction, screen, block, html, action }");
  if (!parsed.ok) return parsed.response;
  const result = await renderBlock(parsed.body, { caller: parsed.caller, config: parsed.config, signal: request.signal });
  return renderJsonResponse(result, parsed.caller);
}
