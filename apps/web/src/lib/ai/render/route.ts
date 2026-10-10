// Server only. The common front of the /api/ai/render/* routes: same guards as every hosted AI route (no cross-site
// requests, JSON only, a body cap, strict Zod) before any ledger or model work.
import type { z } from "zod";
import { resolveAiCaller, type AiCaller } from "../access";
import { rejectForeignRequest } from "../requestGuard";
import { readAiServerConfig, type AiServerConfig } from "../serverConfig";
import { readBodyLimited } from "../vision/server";
import { MAX_RENDER_BODY_BYTES } from "./api";

const NO_STORE = { "Cache-Control": "no-store" };

export type ParsedRenderRequest<T> = { ok: true; body: T; caller: AiCaller | null; config: AiServerConfig } | { ok: false; response: Response };

export async function parseRenderRequest<S extends z.ZodType>(request: Request, schema: S, expected: string): Promise<ParsedRenderRequest<z.output<S>>> {
  const rejected = rejectForeignRequest(request);
  if (rejected) return { ok: false, response: rejected };
  const tooLarge = () => ({ ok: false as const, response: Response.json({ code: "payload-too-large", message: "The request is too large" }, { status: 413, headers: NO_STORE }) });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_RENDER_BODY_BYTES) return tooLarge();
  const raw = await readBodyLimited(request, MAX_RENDER_BODY_BYTES);
  if (raw === null) return tooLarge();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, response: Response.json({ code: "invalid-request", message: "The body is not JSON" }, { status: 400, headers: NO_STORE }) };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { ok: false, response: Response.json({ code: "invalid-request", message: `Expected ${expected}` }, { status: 400, headers: NO_STORE }) };
  const config = readAiServerConfig();
  return { ok: true, body: parsed.data, caller: resolveAiCaller(request, config), config };
}
