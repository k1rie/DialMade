// Wire format of /api/ai/fingerprint. Client-safe (no SDK, no env).
import { z } from "zod";
import { VISION_IMAGE_MAX_BYTES, VISION_MAX_IMAGES, VISION_MAX_SWATCHES, VISION_MEDIA_TYPES } from "./constants";
import type { StyleFingerprintAnswer } from "./schema";

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_IMAGE_BASE64 = Math.ceil(VISION_IMAGE_MAX_BYTES / 3) * 4;

export const FingerprintImageSchema = z.strictObject({
  mediaType: z.enum(VISION_MEDIA_TYPES),
  /** Base64 of the re-encoded image, without the `data:` prefix. */
  data: z.string().min(16).max(MAX_IMAGE_BASE64).regex(BASE64),
  /** The screenshot parser's swatches; the position is the `swatchIndex` the AI answers with. */
  swatches: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(VISION_MAX_SWATCHES),
});

export const FingerprintRequestBodySchema = z.strictObject({
  images: z.array(FingerprintImageSchema).min(1).max(VISION_MAX_IMAGES),
});
export type FingerprintRequestBody = z.infer<typeof FingerprintRequestBodySchema>;

export type FingerprintUsage = { inputTokens: number; outputTokens: number; model: string };

export type FingerprintApiSuccess = {
  /** Validated and normalized (`normalizeFingerprintAnswer`): one ref per screenshot at most. */
  fingerprint: StyleFingerprintAnswer;
  usage: FingerprintUsage;
  /** Refs or color roles of the model that did not fit the request (dropped). */
  dropped: number;
  /** Served from the result cache (same images, swatches, prompt and model): no call, no free use. */
  cached: boolean;
  costUsd: number;
  remainingBudgetUsd: number | null;
  freeUsesRemaining?: number;
  freeUsesTotal?: number;
};

/** GET /api/ai/fingerprint. */
export type FingerprintConfigResponse = {
  /** DIALMADE_AI_VISION_MAX_IMAGES (1–4, default 4). */
  maxImages: number;
  promptId: string;
};
