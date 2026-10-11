// Server only. The common front of the /api/ai/render/* routes: same guards as every hosted AI route (no cross-site
// requests, JSON only, a body cap, strict Zod) before any ledger or model work.
import type { AiRenderTier } from "@dialmade/doc";
import type { z } from "zod";
import { resolveAiAccess, type AiCaller } from "../access";
import { rejectForeignRequest } from "../requestGuard";
import { readAiServerConfig, type AiServerConfig } from "../serverConfig";
import { readBodyLimited } from "../vision/server";
import { MAX_RENDER_BODY_BYTES, type RenderChoice } from "./api";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * `config.freeModel` is the model of THIS call: the free tier's, or the one a full-access account picked. `tier` is its
 * finish (`mockup` unless a full-access account picked another).
 */
export type ParsedRenderRequest<T> = { ok: true; body: T; caller: AiCaller | null; config: AiServerConfig; tier: AiRenderTier } | { ok: false; response: Response };

/**
 * `maxBytes` is the cap of the body as it is read. Above `MAX_RENDER_BODY_BYTES` it only applies to the bodies
 * `mayExceedDefault` accepts once parsed (the direction call, which carries reference screenshots): every other body
 * keeps the default cap, so the larger one does not widen the whole route.
 */
export type RenderRequestLimits = { maxBytes?: number; mayExceedDefault?: (json: unknown) => boolean };

export async function parseRenderRequest<S extends z.ZodType>(
  request: Request,
  schema: S,
  expected: string,
  limits: RenderRequestLimits = {},
): Promise<ParsedRenderRequest<z.output<S>>> {
  const maxBytes = limits.maxBytes ?? MAX_RENDER_BODY_BYTES;
  const rejected = rejectForeignRequest(request);
  if (rejected) return { ok: false, response: rejected };
  const tooLarge = () => ({ ok: false as const, response: Response.json({ code: "payload-too-large", message: "The request is too large" }, { status: 413, headers: NO_STORE }) });
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return tooLarge();
  const raw = await readBodyLimited(request, maxBytes);
  if (raw === null) return tooLarge();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, response: Response.json({ code: "invalid-request", message: "The body is not JSON" }, { status: 400, headers: NO_STORE }) };
  }
  if (maxBytes > MAX_RENDER_BODY_BYTES && new TextEncoder().encode(raw).length > MAX_RENDER_BODY_BYTES && !limits.mayExceedDefault?.(json)) return tooLarge();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { ok: false, response: Response.json({ code: "invalid-request", message: `Expected ${expected}` }, { status: 400, headers: NO_STORE }) };
  const { caller, config } = await resolveAiAccess(request, readAiServerConfig());
  // The model and the finish are «Acceso completo» only (../fullAccess): the free tier never picks them.
  const choice = parsed.data as RenderChoice;
  if ((choice.model !== undefined || choice.tier !== undefined) && !caller?.fullAccess) {
    return { ok: false, response: Response.json({ code: "invalid-request", message: "Only accounts with full access pick the model or the finish" }, { status: 400, headers: NO_STORE }) };
  }
  return { ok: true, body: parsed.data, caller, config: choice.model ? { ...config, freeModel: choice.model } : config, tier: choice.tier ?? "mockup" };
}
