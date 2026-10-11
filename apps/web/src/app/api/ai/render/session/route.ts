import { RenderSessionBodySchema } from "@/lib/ai/render/api";
import { parseRenderRequest } from "@/lib/ai/render/route";
import { openRenderSession, renderJsonResponse } from "@/lib/ai/render/server";

/**
 * «Diseño con IA»: ONE free use of this device opens a design session (1 «Generar con IA» of up to 3 screens and 10
 * block actions in 24 h). 402 `free-tier-exhausted` / `budget-exceeded` / 429 `daily-limit` like every hosted route.
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = await parseRenderRequest(request, RenderSessionBodySchema, "{ screens: 1–3 }");
  if (!parsed.ok) return parsed.response;
  const result = await openRenderSession(parsed.body, { caller: parsed.caller, config: parsed.config, tier: parsed.tier, signal: request.signal });
  return renderJsonResponse(result, parsed.caller);
}
