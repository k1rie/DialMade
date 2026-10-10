// Limits of the vision AI («huella de estilo» of screenshots). Client-safe: shared by the route, the
// BYOK path and the browser-side image preparation.

export const FINGERPRINT_ENDPOINT = "/api/ai/fingerprint";

/** Screenshots per request. `refIndex` is an enum 0–3, so DIALMADE_AI_VISION_MAX_IMAGES can only lower it. */
export const VISION_MAX_IMAGES = 4;
/** Swatches the parser measured per screenshot (`swatchIndex` is an enum 0–11). */
export const VISION_MAX_SWATCHES = 12;

/** Images are re-encoded in the browser: JPEG (no EXIF) at q0.85, long side ≤ 1280 px. */
export const VISION_IMAGE_MAX_SIDE = 1280;
export const VISION_JPEG_QUALITY = 0.85;
/** Per image (decoded bytes). */
export const VISION_IMAGE_MAX_BYTES = 900 * 1024;
/** Base64 characters per request: Vercel functions accept bodies of 4.5 MB. */
export const VISION_MAX_TOTAL_BASE64 = 3_500_000;
/** The JSON body: the images plus their swatches. */
export const MAX_FINGERPRINT_BODY_BYTES = VISION_MAX_TOTAL_BASE64 + 100_000;

/** Thinking at effort `low` counts toward it; the JSON for 4 screenshots is ~1K tokens. */
export const VISION_MAX_OUTPUT_TOKENS = 4000;

/** Bump it when the meaning of the answer changes; the prompt and schema text are hashed into the id too. */
export const VISION_PROMPT_VERSION = "fingerprint-1";

export const VISION_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type VisionMediaType = (typeof VISION_MEDIA_TYPES)[number];
