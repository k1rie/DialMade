// Types and pure helpers of useAiVision. Client-safe.
import { createTtlCache } from "./cache";
import { VISION_PROMPT_ID } from "./prompt";
import type { NormalizedFingerprint, VisionFingerprint } from "./schema";

/** One own screenshot of the import batch, ready for the vision AI. */
export type VisionScreenshot = {
  /** `ImportedBrand.screenshots[].sourceId`: the result is attached to it. */
  sourceId: string;
  /** The original file (PNG, JPEG, WebP, AVIF, GIF…). It is re-encoded to JPEG before leaving the tab. */
  file: Blob;
  /** `ImportedBrand.screenshots[].swatches` (≤ 12 `#rrggbb`); the AI answers with indexes into it. */
  swatches: readonly string[];
  /** SHA-256 of the original file (`ImportedBrand.sources[].sha256`), for the result cache. */
  contentHash: string;
  /** Shown in «mi Claude» («adjunta app.png»). */
  fileName?: string;
  /** Header size, for the estimate before decoding. */
  width?: number;
  height?: number;
};

/** What the toggle needs before the import is parsed: sizes for the estimate. */
export type VisionScreenshotDraft = Partial<VisionScreenshot> & { width?: number; height?: number };

export const isCompleteScreenshot = (shot: VisionScreenshotDraft): shot is VisionScreenshot =>
  typeof shot.sourceId === "string" && shot.file instanceof Blob && Array.isArray(shot.swatches) && typeof shot.contentHash === "string";

export type AiVisionSource = "hosted" | "byok" | "claude";

export type AiVisionFingerprint = {
  sourceId: string;
  /** Position in the request (0-based): «IA · captura {index + 1}». */
  index: number;
  /** Goes into `attachFingerprint(brand, sourceId, fingerprint, model)` of @dialmade/import. */
  fingerprint: VisionFingerprint;
};

export type AiVisionResult = {
  fingerprints: AiVisionFingerprint[];
  /** Screenshots past the server's per-request limit: not analyzed. */
  skipped: string[];
  /** Model that answered («claude.ai» for «mi Claude»). */
  model: string;
  costUsd: number;
  source: AiVisionSource;
  /** From a cache (this tab's or the server's): no call and no free use. */
  cached: boolean;
  /** Entries of the answer that did not fit the request and were dropped. */
  dropped: number;
};

export const MANUAL_MODEL = "claude.ai";

export function toVisionResult(
  screenshots: readonly Pick<VisionScreenshot, "sourceId">[],
  normalized: Pick<NormalizedFingerprint, "fingerprints" | "dropped">,
  meta: Omit<AiVisionResult, "fingerprints" | "dropped">,
): AiVisionResult {
  const fingerprints = screenshots.flatMap((shot, index) => {
    const fingerprint = normalized.fingerprints[index];
    return fingerprint ? [{ sourceId: shot.sourceId, index, fingerprint }] : [];
  });
  return { ...meta, fingerprints, dropped: normalized.dropped };
}

/** Same files and swatches under the same prompt → the same answer, whoever produced it. */
export function visionCacheKey(screenshots: readonly Pick<VisionScreenshot, "contentHash" | "swatches">[]): string {
  return [VISION_PROMPT_ID, ...screenshots.map((shot) => `${shot.contentHash}:${shot.swatches.map((s) => s.toLowerCase()).join(",")}`)].join("|");
}

/** Results of this tab, so switching the toggle off and on again costs nothing. */
export const visionResultCache = createTtlCache<AiVisionResult>({ maxEntries: 50, ttlMs: 60 * 60 * 1000 });
