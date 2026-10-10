import { aiJsonResponse, resolveAiCaller } from "@/lib/ai/access";
import type { AiApiError } from "@/lib/ai/api";
import { LayoutRequestBodySchema } from "@/lib/ai/layout/api";
import { MAX_LAYOUT_BODY_BYTES } from "@/lib/ai/layout/constants";
import { generateHostedLayout } from "@/lib/ai/layout/server";
import { rejectForeignRequest } from "@/lib/ai/requestGuard";
import { readAiServerConfig } from "@/lib/ai/serverConfig";
import { readBodyLimited } from "@/lib/ai/vision/server";

// Node.js runtime (the default; `runtime` cannot be set with cacheComponents): the SDK, node:crypto and
// the ledger need it.
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

const error = (status: number, body: AiApiError) => Response.json(body, { status, headers: NO_STORE });
const tooLarge = () => error(413, { code: "payload-too-large", message: "The request is too large" });

/**
 * Modo Layout v1.1: «Describe tu producto» (`task: "propose"`, 2–3 variants of screens and library blocks) or
 * «Sugerir con IA» for free blocks (`task: "map"`). ONE free use of this device per request, whatever the number of
 * variants or blocks (402 `free-tier-exhausted` when there are none left: the UI offers BYOK or «mi Claude»). The
 * answer is validated with Zod here and again in the browser, which normalizes it before anything is drawn.
 */
export async function POST(request: Request): Promise<Response> {
  const rejected = rejectForeignRequest(request);
  if (rejected) return rejected;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_LAYOUT_BODY_BYTES) return tooLarge();

  const raw = await readBodyLimited(request, MAX_LAYOUT_BODY_BYTES);
  if (raw === null) return tooLarge();

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return error(400, { code: "invalid-request", message: "The body is not JSON" });
  }
  const body = LayoutRequestBodySchema.safeParse(json);
  if (!body.success) {
    return error(400, {
      code: "invalid-request",
      message: "Expected { task: \"propose\", description, locale, kind, … } or { task: \"map\", locale, blocks: [{ screen, screenKind, label, rect, … }] }",
    });
  }

  const config = readAiServerConfig();
  const caller = resolveAiCaller(request, config);
  const result = await generateHostedLayout(body.data, { caller, config, signal: request.signal });
  return aiJsonResponse(result, caller);
}
