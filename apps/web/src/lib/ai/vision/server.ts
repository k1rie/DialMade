// Server only: POST /api/ai/fingerprint under the free-tier policy of ../access. Never import it from client code.
import { createHash } from "node:crypto";
import { aiFailure, aiStatus, runWithAiBudget, type AiBudgetDeps, type AiCaller, type AiHostedResult } from "../access";
import { supportsDefaultFallbacks } from "../config";
import { maxRequestCostUsd } from "../pricing";
import { readAiServerConfig, type Env } from "../serverConfig";
import type { FingerprintApiSuccess, FingerprintRequestBody } from "./api";
import { createTtlCache, type TtlCache } from "./cache";
import { VISION_IMAGE_MAX_BYTES, VISION_MAX_IMAGES, VISION_MAX_OUTPUT_TOKENS, VISION_MAX_TOTAL_BASE64, type VisionMediaType } from "./constants";
import { countVisionTokens, generateFingerprint } from "./generate";
import { VISION_PROMPT_ID, type VisionPromptImage } from "./prompt";

export type VisionServerConfig = {
  /** DIALMADE_AI_VISION_MAX_IMAGES: 1–4 (default 4). */
  maxImages: number;
};

export function readVisionServerConfig(env: Env = process.env): VisionServerConfig {
  const raw = env.DIALMADE_AI_VISION_MAX_IMAGES?.trim();
  const parsed = raw ? Number(raw) : VISION_MAX_IMAGES;
  if (!Number.isInteger(parsed) || parsed < 1) {
    if (raw) console.error(`[ai] DIALMADE_AI_VISION_MAX_IMAGES="${raw}" is not an integer ≥ 1: using 1`);
    return { maxImages: 1 };
  }
  return { maxImages: Math.min(parsed, VISION_MAX_IMAGES) };
}

/** The body as text, read as a stream so a chunked request cannot exceed `limit` in memory; `null` when it does. */
export async function readBodyLimited(request: Request, limit: number): Promise<string | null> {
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

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) => signature.every((byte, i) => bytes[offset + i] === byte);

/** The declared type must match the file's magic bytes (the API rejects a mismatch with a 400). */
export function matchesMediaType(bytes: Uint8Array, mediaType: VisionMediaType): boolean {
  switch (mediaType) {
    case "image/jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/gif":
      return startsWith(bytes, [0x47, 0x49, 0x46, 0x38]);
    case "image/webp":
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  }
}

export type CachedFingerprint = Pick<FingerprintApiSuccess, "fingerprint" | "usage" | "dropped">;

/**
 * Results by content: same image bytes, swatches, prompt and model → same answer, at no cost. In
 * memory, per server instance (24 h, 200 entries): no image is kept, only the validated answer.
 */
const sharedCache: TtlCache<CachedFingerprint> = createTtlCache({ maxEntries: 200, ttlMs: 24 * 60 * 60 * 1000 });

export function fingerprintCacheKey(model: string, images: readonly { bytes: Uint8Array; swatches: readonly string[] }[]): string {
  const hash = createHash("sha256").update(`${VISION_PROMPT_ID}\n${model}\n`);
  for (const image of images) {
    hash.update(createHash("sha256").update(image.bytes).digest("hex"));
    hash.update(`:${image.swatches.map((swatch) => swatch.toLowerCase()).join(",")}\n`);
  }
  return hash.digest("hex");
}

export type HostedFingerprintData = Pick<FingerprintApiSuccess, "fingerprint" | "usage" | "dropped" | "cached">;

export type HostedFingerprintContext = AiBudgetDeps & {
  caller: AiCaller | null;
  vision?: VisionServerConfig;
  /** `null` turns the result cache off (tests). */
  cache?: TtlCache<CachedFingerprint> | null;
};

type CheckedImage = VisionPromptImage & { bytes: Uint8Array };

function checkImages(body: FingerprintRequestBody, maxImages: number): CheckedImage[] | ReturnType<typeof aiFailure> {
  if (body.images.length > maxImages) return aiFailure(400, "invalid-request", `At most ${maxImages} images per request`);
  const totalBase64 = body.images.reduce((sum, image) => sum + image.data.length, 0);
  if (totalBase64 > VISION_MAX_TOTAL_BASE64) return aiFailure(413, "payload-too-large", "The images are too large together");
  const checked: CheckedImage[] = [];
  for (const image of body.images) {
    const bytes = new Uint8Array(Buffer.from(image.data, "base64"));
    if (bytes.byteLength > VISION_IMAGE_MAX_BYTES) return aiFailure(413, "payload-too-large", "An image is larger than 900 KB");
    if (!matchesMediaType(bytes, image.mediaType)) return aiFailure(400, "invalid-request", `An image is not a valid ${image.mediaType}`);
    checked.push({ mediaType: image.mediaType, data: image.data, swatches: image.swatches, bytes });
  }
  return checked;
}

/**
 * Validates the images, answers from the result cache when it can (no call, no free use), and
 * otherwise makes one structured-output call under the free tier: device uses, IP limit and global
 * budget are checked and the worst case (count_tokens with the images + max_tokens at list price)
 * reserved atomically before calling, then settled with the real usage. Model: the free tier's.
 */
export async function generateHostedFingerprint(body: FingerprintRequestBody, context: HostedFingerprintContext): Promise<AiHostedResult<HostedFingerprintData>> {
  const config = context.config ?? readAiServerConfig(context.env);
  const vision = context.vision ?? readVisionServerConfig(context.env);
  const cache = context.cache === undefined ? sharedCache : context.cache;

  const images = checkImages(body, vision.maxImages);
  if (!Array.isArray(images)) return images;

  const key = fingerprintCacheKey(config.freeModel, images);
  const hit = cache?.get(key);
  if (hit) {
    const status = await aiStatus(context.caller, { ...context, config });
    return {
      ok: true,
      status: 200,
      body: {
        ...hit,
        cached: true,
        costUsd: 0,
        remainingBudgetUsd: status.remainingBudgetUsd ?? 0,
        freeUsesRemaining: status.freeUsesRemaining,
        freeUsesTotal: status.freeUsesTotal,
      },
    };
  }

  const prompt: VisionPromptImage[] = images.map(({ mediaType, data, swatches }) => ({ mediaType, data, swatches }));
  const result = await runWithAiBudget<HostedFingerprintData>(
    context.caller,
    {
      estimate: async ({ client, model, requestOptions }) => {
        const inputTokens = await countVisionTokens(client, prompt, { model }, requestOptions);
        return maxRequestCostUsd({ model, inputTokens, maxOutputTokens: VISION_MAX_OUTPUT_TOKENS, fallbacks: supportsDefaultFallbacks(model) });
      },
      run: async ({ client, model, effort, requestOptions }) => {
        const generated = await generateFingerprint(client, prompt, { model, effort }, requestOptions);
        return {
          data: { fingerprint: generated.answer, usage: generated.usage, dropped: generated.dropped, cached: false },
          costUsd: generated.costUsd,
        };
      },
    },
    { ...context, config },
  );
  if (result.ok) cache?.set(key, { fingerprint: result.body.fingerprint, usage: result.body.usage, dropped: result.body.dropped });
  return result;
}
