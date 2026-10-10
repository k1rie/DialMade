// The cost line of «Generar con IA», shown BEFORE any call (spec §5.5, §10.1): «≈ $0.013 · 1 uso de 5 · 3 pantallas
// · ≈ 30 s». Built from the probe and spike measurements (§11, §15.1) and the model's price card; Track C's estimate
// for BYOK (count_tokens, Opus/Sonnet ranges) replaces it on those paths. Pure.
import { usageCostUsd } from "../../pricing";

/** Measured with Haiku 5.5 (spec §5.5, §11): ≈ 1030–1100 output tokens per block, plus a little thinking. */
const OUTPUT_TOKENS_PER_BLOCK = 1_150;
/** Screen data sent without cache: the screen header plus each block's data and draft. */
const SCREEN_INPUT_TOKENS = 400;
const BLOCK_INPUT_TOKENS = 350;
/** The cached prefix: the system prompt (≈ 3000) and the art direction (≈ 1500). */
const CACHED_PREFIX_TOKENS = 4_500;
/** The direction call: brand, candidates and the screens' outline in; the structured answer (with thinking) out. */
const DIRECTION_USAGE = { input_tokens: 2_500, output_tokens: 2_500 };

/** Latency (spec §15.1: 18.6–28.3 s per screen, TTFT 5–9 s; the direction takes 3–4 s). Screens run in parallel. */
const SCREEN_BASE_SECONDS = 5;
const SECONDS_PER_BLOCK = 3.4;
const DIRECTION_SECONDS = 4;

export type RenderEstimate = { costUsd: number; seconds: number; screens: number };

/**
 * One generate: the art direction (when the document has none to reuse) and one streamed screen per entry of
 * `blocksPerScreen` (the blocks it asks for). The first screen writes the cached prefix, the others read it.
 */
export function estimateGenerate(input: { blocksPerScreen: readonly number[]; direction: boolean; model: string }): RenderEstimate {
  const { blocksPerScreen, direction, model } = input;
  let costUsd = direction ? usageCostUsd(DIRECTION_USAGE, model) : 0;
  blocksPerScreen.forEach((blocks, index) => {
    costUsd += usageCostUsd(
      {
        input_tokens: SCREEN_INPUT_TOKENS + blocks * BLOCK_INPUT_TOKENS,
        output_tokens: blocks * OUTPUT_TOKENS_PER_BLOCK,
        ...(index === 0 ? { cache_creation_input_tokens: CACHED_PREFIX_TOKENS } : { cache_read_input_tokens: CACHED_PREFIX_TOKENS }),
      },
      model,
    );
  });
  const slowest = Math.max(0, ...blocksPerScreen.map((blocks) => SCREEN_BASE_SECONDS + blocks * SECONDS_PER_BLOCK));
  const raw = (direction ? DIRECTION_SECONDS : 0) + (blocksPerScreen.length > 0 ? slowest : 0);
  // Rounded up to 5 s: it is a promise of «about», not a countdown.
  const seconds = Math.max(5, Math.ceil(raw / 5) * 5);
  return { costUsd, seconds, screens: blocksPerScreen.length };
}

/**
 * The cost line's figure: three decimals below 10 cents («$0.013», where `formatUsd` would round to «$0.01» and hide
 * the difference between one and three screens), two above. Same locales as `formatUsd`.
 */
export function formatRenderCost(value: number, locale: string): string {
  const digits = value < 0.1 ? 3 : 2;
  return new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
