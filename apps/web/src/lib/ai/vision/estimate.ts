// Cost shown before calling the vision AI. Approximate on purpose: the server reserves the exact
// worst case with count_tokens and settles the real usage.
import { priceFor } from "../pricing";
import { VISION_IMAGE_MAX_SIDE } from "./constants";
import { VISION_SYSTEM_PROMPT } from "./prompt";
import { STYLE_FINGERPRINT_JSON_SCHEMA } from "./schema";

/** When the header size is unknown: a typical laptop screenshot after reduction. */
const DEFAULT_SIZE = { width: 1280, height: 800 } as const;
const CHARS_PER_TOKEN = 3.6;
/** Swatch block, labels and task line per screenshot. */
const TEXT_TOKENS_PER_IMAGE = 90;
/** Thinking at effort `low` plus the JSON; measured cost replaces it after the call. */
const OUTPUT_TOKENS = { base: 500, perImage: 300 } as const;

const FIXED_PROMPT_TOKENS = Math.ceil((VISION_SYSTEM_PROMPT.length + JSON.stringify(STYLE_FINGERPRINT_JSON_SCHEMA).length) / CHARS_PER_TOKEN);

export type ImageSize = { width?: number; height?: number };

/** ≈ one token per 28×28 px patch of the image as it is sent (long side ≤ 1280 px). */
export function visionImageTokens({ width, height }: ImageSize = {}): number {
  const w = width && width > 0 ? width : DEFAULT_SIZE.width;
  const h = height && height > 0 ? height : DEFAULT_SIZE.height;
  const scale = Math.min(1, VISION_IMAGE_MAX_SIDE / Math.max(w, h));
  return Math.ceil((Math.round(w * scale) * Math.round(h * scale)) / 784);
}

/** Rough USD of one analysis of `images` with `model`, before calling the AI. */
export function estimateVisionCostUsd(model: string, images: readonly ImageSize[]): number {
  if (images.length === 0) return 0;
  const input = FIXED_PROMPT_TOKENS + images.reduce((sum, image) => sum + visionImageTokens(image) + TEXT_TOKENS_PER_IMAGE, 0);
  const output = OUTPUT_TOKENS.base + OUTPUT_TOKENS.perImage * images.length;
  const price = priceFor(model, input);
  return (input * price.input + output * price.output) / 1_000_000;
}

export { formatUsd } from "@/lib/money";
