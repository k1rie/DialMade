/** USD per million tokens. `cacheWrite` is the 5-minute TTL (1.25× input), the only one Dialmade uses. */
export type ModelPrice = { input: number; output: number; cacheRead: number; cacheWrite: number };

const PRICES: Readonly<Record<string, ModelPrice>> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  // Targets of `fallbacks: "default"`: a refused request can be served (and billed) by them.
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
};

/** Claude Haiku 5.5 switches to this card when the prompt is longer than 100K tokens. */
const HAIKU_LONG_PROMPT: ModelPrice = { input: 0.5, output: 2.5, cacheRead: 0.05, cacheWrite: 0.625 };
const HAIKU_LONG_PROMPT_TOKENS = 100_000;

/** Unknown models are priced like the most expensive one, so the hard budget never under-counts. */
const CONSERVATIVE: ModelPrice = PRICES["claude-fable-5-1"]!;

/** Models a `fallbacks: "default"` hop may land on (for the worst-case estimate). */
export const FALLBACK_PRICE_MODELS = ["claude-opus-5", "claude-opus-4-8", "claude-sonnet-5"] as const;

export function priceFor(model: string, promptTokens = 0): ModelPrice & { known: boolean } {
  const id = Object.keys(PRICES).find((key) => model === key || model.startsWith(`${key}-`) || model.startsWith(`${key}@`));
  if (!id) return { ...CONSERVATIVE, known: false };
  if (id === "claude-haiku-5-5" && promptTokens > HAIKU_LONG_PROMPT_TOKENS) return { ...HAIKU_LONG_PROMPT, known: true };
  return { ...PRICES[id]!, known: true };
}

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

export const promptTokensOf = (usage: TokenUsage): number =>
  usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);

export function usageCostUsd(usage: TokenUsage, model: string): number {
  const price = priceFor(model, promptTokensOf(usage));
  return (
    (usage.input_tokens * price.input +
      (usage.cache_creation_input_tokens ?? 0) * price.cacheWrite +
      (usage.cache_read_input_tokens ?? 0) * price.cacheRead +
      usage.output_tokens * price.output) /
    1_000_000
  );
}

type Iteration = TokenUsage & { type: string; model?: string | null };
type MessageLike = { model: string; usage: TokenUsage & { iterations?: readonly Iteration[] | null } };

/**
 * Cost of a response. With fallbacks `usage.iterations` is the per-attempt source of truth (each at
 * its own model's price); without them the top-level usage covers the single attempt.
 */
export function messageCostUsd(message: MessageLike, requestedModel: string): number {
  const attempts = (message.usage.iterations ?? []).filter((it) => it.type === "message" || it.type === "fallback_message");
  if (attempts.length === 0) return usageCostUsd(message.usage, message.model);
  return attempts.reduce((sum, it) => sum + usageCostUsd(it, it.model ?? requestedModel), 0);
}

/** Total prompt and output tokens of a response (all attempts). */
export function messageTokens(message: MessageLike): { inputTokens: number; outputTokens: number } {
  const attempts = (message.usage.iterations ?? []).filter((it) => it.type === "message" || it.type === "fallback_message");
  const list: readonly TokenUsage[] = attempts.length > 0 ? attempts : [message.usage];
  return {
    inputTokens: list.reduce((sum, it) => sum + promptTokensOf(it), 0),
    outputTokens: list.reduce((sum, it) => sum + it.output_tokens, 0),
  };
}

/**
 * Upper bound of what one request can cost: the whole prompt as a cache write plus `maxOutputTokens`
 * of output, and, when fallbacks are on, a hop to the most expensive fallback model whose prompt also
 * carries the declined partial answer as continuation context.
 */
export function maxRequestCostUsd(options: {
  model: string;
  inputTokens: number;
  maxOutputTokens: number;
  fallbacks: boolean;
}): number {
  const worst = (price: ModelPrice, inputTokens: number) =>
    (inputTokens * Math.max(price.input, price.cacheWrite) + options.maxOutputTokens * price.output) / 1_000_000;
  const primary = worst(priceFor(options.model, options.inputTokens), options.inputTokens);
  if (!options.fallbacks) return primary;
  const hopInput = options.inputTokens + options.maxOutputTokens;
  return primary + Math.max(...FALLBACK_PRICE_MODELS.map((model) => worst(priceFor(model, hopInput), hopInput)));
}

export const roundUsd = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;
