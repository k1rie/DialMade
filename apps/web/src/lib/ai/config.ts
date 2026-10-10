// Shared by the server route and the BYOK client. No secrets here: the server reads its env in ./server.

export const DEFAULT_AI_MODEL = "claude-opus-5-5";

export const AI_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type AiEffort = (typeof AI_EFFORTS)[number];
/** Copywriting over a short brief does not need deep reasoning; `low` keeps latency and cost down. */
export const DEFAULT_AI_EFFORT: AiEffort = "low";

/** Thinking counts toward it too. A page's copy as JSON is ~2K tokens; the rest is headroom. */
export const MAX_OUTPUT_TOKENS = 8192;

export const DEFAULT_MONTHLY_BUDGET_USD = 5;
/** Free tier policy (docs/design/importar-guia.md, «Política de acceso a la IA»). */
export const DEFAULT_FREE_USES_PER_MONTH = 5;
export const DEFAULT_MAX_REQUESTS_PER_IP_PER_DAY = 10;
/** A reservation without an answer after this long is charged in full (the SQL ledger uses the same). */
export const RESERVATION_TTL_SECONDS = 600;

/** Server-side refusal fallback chosen by Anthropic per refusal category (`fallbacks: "default"`). */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const DEFAULT_FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

/** Models that accept `fallbacks: "default"` (Claude Haiku 5.5 has no server-side fallback). */
export const supportsDefaultFallbacks = (model: string): boolean => DEFAULT_FALLBACK_MODELS.has(model);

const NO_EFFORT = /^claude-(?:3|haiku-4-5|sonnet-4-5|sonnet-4-0|sonnet-4-2|opus-4-0|opus-4-1)/;
/** `output_config.effort` errors on a few older models. */
export const supportsEffort = (model: string): boolean => !NO_EFFORT.test(model);

export const isAiEffort = (value: unknown): value is AiEffort =>
  typeof value === "string" && (AI_EFFORTS as readonly string[]).includes(value);

/** Section ids the client may ask for in one request, and the length of the free-text request. */
export const MAX_SECTION_IDS = 64;
export const MAX_INSTRUCTIONS_LENGTH = 500;
/** Fields sent to the model in one request (a full landing page has ~80). */
export const MAX_COPY_FIELDS = 160;
