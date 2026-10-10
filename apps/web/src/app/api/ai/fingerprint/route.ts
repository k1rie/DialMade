import { connection } from "next/server";
import { aiJsonResponse, resolveAiCaller } from "@/lib/ai/access";
import type { AiApiError } from "@/lib/ai/api";
import { rejectForeignRequest } from "@/lib/ai/requestGuard";
import { readAiServerConfig } from "@/lib/ai/serverConfig";
import { FingerprintRequestBodySchema, type FingerprintConfigResponse } from "@/lib/ai/vision/api";
import { MAX_FINGERPRINT_BODY_BYTES } from "@/lib/ai/vision/constants";
import { VISION_PROMPT_ID } from "@/lib/ai/vision/prompt";
import { generateHostedFingerprint, readBodyLimited, readVisionServerConfig } from "@/lib/ai/vision/server";

// Node.js runtime (the default; `runtime` cannot be set with cacheComponents): the SDK, node:crypto and
// the ledger need it.
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

const error = (status: number, body: AiApiError) => Response.json(body, { status, headers: NO_STORE });
const tooLarge = () => error(413, { code: "payload-too-large", message: "The images are too large" });

/** `{ maxImages, promptId }`: how many screenshots one request takes on this server. */
export async function GET(): Promise<Response> {
  await connection();
  const body: FingerprintConfigResponse = { maxImages: readVisionServerConfig().maxImages, promptId: VISION_PROMPT_ID };
  return Response.json(body, { headers: NO_STORE });
}

/**
 * Style fingerprint of 1–4 screenshots (images already reduced in the browser plus the parser's
 * swatches), with one free use of this device (402 `free-tier-exhausted` when there are none left:
 * the UI offers BYOK or «mi Claude»). The AI answers with swatch indexes, never with colors.
 */
export async function POST(request: Request): Promise<Response> {
  const rejected = rejectForeignRequest(request);
  if (rejected) return rejected;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_FINGERPRINT_BODY_BYTES) return tooLarge();

  const raw = await readBodyLimited(request, MAX_FINGERPRINT_BODY_BYTES);
  if (raw === null) return tooLarge();

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return error(400, { code: "invalid-request", message: "The body is not JSON" });
  }
  const body = FingerprintRequestBodySchema.safeParse(json);
  if (!body.success) return error(400, { code: "invalid-request", message: "Expected { images: [{ mediaType, data, swatches }] }" });

  const config = readAiServerConfig();
  const caller = resolveAiCaller(request, config);
  const result = await generateHostedFingerprint(body.data, { caller, config, signal: request.signal });
  return aiJsonResponse(result, caller);
}
