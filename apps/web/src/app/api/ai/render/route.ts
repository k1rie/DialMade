import { RenderRequestBodySchema } from "@/lib/ai/render/api";
import { parseRenderRequest } from "@/lib/ai/render/route";
import { renderDirection, renderJsonResponse, renderScreen, renderStreamResponse } from "@/lib/ai/render/server";

// Node.js runtime (the SDK, node:crypto and the ledger need it). A screen streams for ≈ 25 s with Haiku 5.5; the
// upstream call has 45 s (AI_GENERATE_TIMEOUT_MS) plus count_tokens.
export const maxDuration = 60;

/**
 * «Diseño con IA» inside a design session: `task: "direction"` (JSON) or `task: "screen"` (SSE: `block` events with
 * the RAW html of each root as it closes, then `usage` and `done`). The client sanitizes every block in a worker.
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = await parseRenderRequest(request, RenderRequestBodySchema, '{ task: "direction" | "screen", sessionId, brand, … }');
  if (!parsed.ok) return parsed.response;
  const context = { caller: parsed.caller, config: parsed.config, signal: request.signal };
  if (parsed.body.task === "direction") return renderJsonResponse(await renderDirection(parsed.body, context), parsed.caller);
  const result = await renderScreen(parsed.body, context);
  return result.ok ? renderStreamResponse(result.body, parsed.caller) : renderJsonResponse(result, parsed.caller);
}
