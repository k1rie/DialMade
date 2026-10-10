import { aiJsonResponse, resolveAiCaller } from "@/lib/ai/access";
import { CopyRequestBodySchema, MAX_COPY_BODY_BYTES, type AiApiError } from "@/lib/ai/api";
import { rejectForeignRequest } from "@/lib/ai/requestGuard";
import { generateHostedCopy } from "@/lib/ai/server";
import { readAiServerConfig } from "@/lib/ai/serverConfig";

// Node.js runtime (the default; `runtime` cannot be set with cacheComponents): the SDK, node:crypto and
// the ledger need it.
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };

const error = (status: number, body: AiApiError) => Response.json(body, { status, headers: NO_STORE });
const tooLarge = () => error(413, { code: "payload-too-large", message: "The document is too large" });

/** The body as text, read as a stream so a chunked request (no content-length) cannot exceed `limit` in memory. */
async function readLimited(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

/**
 * Copy for the sections of one page as an RFC 6902 patch, with one free use of this device (402
 * `free-tier-exhausted` when there are none left: the UI offers BYOK or «mi Claude»).
 */
export async function POST(request: Request): Promise<Response> {
  const rejected = rejectForeignRequest(request);
  if (rejected) return rejected;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_COPY_BODY_BYTES) return tooLarge();

  const raw = await readLimited(request, MAX_COPY_BODY_BYTES);
  if (raw === null) return tooLarge();

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return error(400, { code: "invalid-request", message: "The body is not JSON" });
  }
  const body = CopyRequestBodySchema.safeParse(json);
  if (!body.success) return error(400, { code: "invalid-request", message: "Expected { doc, kind, sectionIds?, instructions?, locale }" });

  const config = readAiServerConfig();
  const caller = resolveAiCaller(request, config);
  const result = await generateHostedCopy(body.data, { caller, config, signal: request.signal });
  return aiJsonResponse(result, caller);
}
