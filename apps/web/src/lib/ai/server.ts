// Server only: reads ANTHROPIC_API_KEY. Never import it from client components.
import Anthropic from "@anthropic-ai/sdk";
import { safeParseDesignDoc } from "@dialmade/doc";
import type { AiStatus, CopyApiError, CopyApiErrorCode, CopyApiSuccess, CopyRequestBody } from "./api";
import { remainingBudgetUsd, requestsLeftToday, reserveBudget, takeDailyRequest } from "./budget";
import {
  DEFAULT_AI_EFFORT,
  DEFAULT_AI_MODEL,
  DEFAULT_MAX_REQUESTS_PER_IP_PER_DAY,
  DEFAULT_MONTHLY_BUDGET_USD,
  MAX_OUTPUT_TOKENS,
  isAiEffort,
  supportsDefaultFallbacks,
  type AiEffort,
} from "./config";
import { CopyGenerationError, countCopyTokens, generateCopy, prepareCopyJob } from "./generate";
import { maxRequestCostUsd, roundUsd } from "./pricing";

/** Prompt size assumed by `/api/ai/status` for «can the budget still pay for a request?». */
const TYPICAL_INPUT_TOKENS = 8_000;
/** Wall clock of the two upstream calls; together they stay under the route's `maxDuration` (60 s). */
const COUNT_TIMEOUT_MS = 10_000;
const GENERATE_TIMEOUT_MS = 45_000;

/** Platforms where the in-memory ledger is per instance and resets on cold starts. */
const SERVERLESS_ENV = ["VERCEL", "AWS_LAMBDA_FUNCTION_NAME", "NETLIFY", "FUNCTIONS_WORKER_RUNTIME", "K_SERVICE"] as const;

export type AiServerConfig = {
  apiKey: string | undefined;
  model: string;
  effort: AiEffort;
  monthlyBudgetUsd: number;
  maxRequestsPerIpPerDay: number;
  /**
   * The hard budget lives in this process's memory (./budget). On a serverless platform that is not
   * a hard limit, so the hosted AI stays off there (fails closed) until the ledger is persisted.
   */
  serverless: boolean;
};

type Env = Readonly<Record<string, string | undefined>>;

/** Unset → `fallback`. Set but not a number ≥ 0 (a typo like «$1» or «-1») → 0, so the hosted AI fails closed. */
function nonNegative(env: Env, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  console.error(`[ai] ${name}="${raw}" is not a number ≥ 0: using 0 (hosted AI off)`);
  return 0;
}

export function readAiServerConfig(env: Env = process.env): AiServerConfig {
  const effort = env.DIALMADE_AI_EFFORT?.trim();
  return {
    apiKey: env.ANTHROPIC_API_KEY?.trim() || undefined,
    model: env.DIALMADE_AI_MODEL?.trim() || DEFAULT_AI_MODEL,
    effort: isAiEffort(effort) ? effort : DEFAULT_AI_EFFORT,
    monthlyBudgetUsd: nonNegative(env, "DIALMADE_AI_MONTHLY_BUDGET_USD", DEFAULT_MONTHLY_BUDGET_USD),
    maxRequestsPerIpPerDay: Math.floor(nonNegative(env, "DIALMADE_AI_MAX_REQUESTS_PER_IP_PER_DAY", DEFAULT_MAX_REQUESTS_PER_IP_PER_DAY)),
    serverless: SERVERLESS_ENV.some((name) => !!env[name]),
  };
}

/** Hosted AI is usable: a key, and a process whose memory can hold the hard budget. */
const hostedEnabled = (config: AiServerConfig) => !!config.apiKey && !config.serverless;

/** Reservation of a typical request, so the UI stops offering the hosted AI before it can only answer 402. */
export const typicalRequestCostUsd = (model: string): number =>
  roundUsd(
    maxRequestCostUsd({ model, inputTokens: TYPICAL_INPUT_TOKENS, maxOutputTokens: MAX_OUTPUT_TOKENS, fallbacks: supportsDefaultFallbacks(model) }),
  );

export function aiStatus(config: AiServerConfig = readAiServerConfig(), now = new Date()): AiStatus {
  const configured = hostedEnabled(config);
  return {
    configured,
    model: config.model,
    remainingBudgetUsd: configured ? roundUsd(remainingBudgetUsd(config.monthlyBudgetUsd, now)) : null,
    minRequestUsd: typicalRequestCostUsd(config.model),
  };
}

export type HostedCopyResult = { status: number; body: CopyApiSuccess | CopyApiError; headers?: Record<string, string> };

const fail = (status: number, code: CopyApiErrorCode, message: string, extra: Partial<CopyApiError> = {}): HostedCopyResult => ({
  status,
  body: { code, message, ...extra },
  ...(extra.retryAfterSeconds !== undefined && { headers: { "Retry-After": String(extra.retryAfterSeconds) } }),
});

/** SDK error → HTTP answer. Checked from the most specific class to the base one. */
function fromSdkError(error: unknown): HostedCopyResult {
  if (error instanceof Anthropic.APIUserAbortError) return fail(499, "aborted", "Request aborted");
  if (error instanceof Anthropic.APIConnectionTimeoutError) return fail(504, "network", "Anthropic API timed out");
  if (error instanceof Anthropic.APIConnectionError) return fail(502, "network", "Could not reach the Anthropic API");
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error("[ai] ANTHROPIC_API_KEY was rejected by the Anthropic API");
    return fail(503, "ai-not-configured", "The server's AI key is not valid");
  }
  if (error instanceof Anthropic.NotFoundError) {
    console.error("[ai] DIALMADE_AI_MODEL was not found:", error.message);
    return fail(503, "ai-not-configured", "The configured model does not exist");
  }
  if (error instanceof Anthropic.RateLimitError) {
    const header = error.headers.get("retry-after");
    const retry = header ? Number(header) : Number.NaN;
    return fail(429, "rate-limited", "Anthropic API rate limit", Number.isFinite(retry) ? { retryAfterSeconds: retry } : {});
  }
  if (error instanceof Anthropic.InternalServerError) return fail(503, "overloaded", "Anthropic API overloaded or failing");
  if (error instanceof Anthropic.BadRequestError) {
    console.error("[ai] Anthropic API rejected the request:", error.requestID, error.message);
    return fail(502, "upstream-error", "The Anthropic API rejected the request");
  }
  if (error instanceof Anthropic.APIError) {
    console.error("[ai] Anthropic API error:", error.status, error.requestID);
    return fail(502, "upstream-error", "Anthropic API error");
  }
  if (error instanceof CopyGenerationError) return fail(error.code === "refused" ? 422 : 502, error.code, error.message);
  console.error("[ai] unexpected error:", error);
  return fail(500, "upstream-error", "Unexpected error");
}

/** The API answered with an error status: the request was not billed. */
const isHttpError = (error: unknown) =>
  error instanceof Anthropic.APIError &&
  !(error instanceof Anthropic.APIUserAbortError) &&
  !(error instanceof Anthropic.APIConnectionError);

export type HostedCopyContext = {
  ip: string;
  /** Aborts only the free token count: once the paid call starts it runs to the end and is billed at its real cost. */
  signal?: AbortSignal;
  config?: AiServerConfig;
  /** Injected in tests. */
  client?: Anthropic;
  now?: Date;
};

/**
 * POST /api/ai/copy. Order: configuration → document → fields → budget and IP limit (count_tokens +
 * max_tokens at list price, reserved up front) → one structured-output call → validated patch.
 * The paid call is never retried by the SDK (one attempt per reservation) and never cancelled by the
 * client: its real `usage` is always settled. Only a truly unknown outcome (timeout, network failure
 * after sending) keeps the whole reservation as spent, so the budget can be over-counted, never exceeded.
 */
export async function generateHostedCopy(body: CopyRequestBody, context: HostedCopyContext): Promise<HostedCopyResult> {
  const config = context.config ?? readAiServerConfig();
  const now = context.now ?? new Date();
  if (!config.apiKey) return fail(503, "ai-not-configured", "ANTHROPIC_API_KEY is not set");
  if (config.serverless) {
    console.error("[ai] Hosted AI is off on serverless: the in-memory budget ledger is not a hard limit there (see lib/ai/budget.ts)");
    return fail(503, "ai-not-configured", "The hosted AI needs a persistent budget ledger on this platform");
  }

  const parsed = safeParseDesignDoc(body.doc);
  if (!parsed.success) return fail(400, "invalid-request", "The document is not a valid DesignDoc");
  const doc = parsed.data;
  if (!doc.pages[body.kind]) return fail(400, "no-page", `The document has no ${body.kind} page`);

  const job = prepareCopyJob({
    doc,
    kind: body.kind,
    locale: body.locale,
    ...(body.sectionIds && { sectionIds: body.sectionIds }),
    ...(body.instructions && { instructions: body.instructions }),
  });
  if (job.fields.length === 0) return fail(422, "no-fields", "There is no text to write in those sections");

  const left = () => roundUsd(remainingBudgetUsd(config.monthlyBudgetUsd, now));
  if (left() <= 0) return fail(402, "budget-exceeded", "The monthly AI budget is spent", { remainingBudgetUsd: 0 });
  const dailyLimit = () => fail(429, "daily-limit", "Daily AI request limit reached for this network");
  if (requestsLeftToday(context.ip, config.maxRequestsPerIpPerDay, now) <= 0) return dailyLimit();

  const client = context.client ?? new Anthropic({ apiKey: config.apiKey, maxRetries: 0 });
  const options = { model: config.model, effort: config.effort };

  let inputTokens: number;
  try {
    inputTokens = await countCopyTokens(client, job, options, {
      ...(context.signal && { signal: context.signal }),
      timeout: COUNT_TIMEOUT_MS,
      maxRetries: 0,
    });
  } catch (error) {
    return fromSdkError(error);
  }

  const maxCost = maxRequestCostUsd({
    model: config.model,
    inputTokens,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    fallbacks: supportsDefaultFallbacks(config.model),
  });
  const reservation = reserveBudget(maxCost, config.monthlyBudgetUsd, now);
  if (!reservation) {
    return fail(402, "budget-exceeded", `This request could cost up to $${maxCost.toFixed(4)} and the month has $${left().toFixed(4)} left`, {
      remainingBudgetUsd: left(),
    });
  }
  if (!takeDailyRequest(context.ip, config.maxRequestsPerIpPerDay, now)) {
    reservation.release();
    return dailyLimit();
  }

  try {
    const result = await generateCopy(client, doc, job, options, { timeout: GENERATE_TIMEOUT_MS, maxRetries: 0 });
    reservation.settle(result.costUsd);
    return {
      status: 200,
      body: {
        patches: result.patches,
        usage: result.usage,
        costUsd: roundUsd(result.costUsd),
        rejected: result.rejected,
        remainingBudgetUsd: left(),
      },
    };
  } catch (error) {
    if (error instanceof CopyGenerationError && error.response) reservation.settle(error.response.costUsd);
    else if (isHttpError(error)) reservation.release();
    else reservation.settle(maxCost);
    return fromSdkError(error);
  }
}

/**
 * The client's address for the per-IP limit, never the client-controlled start of `x-forwarded-for`.
 * On Vercel, `x-real-ip` (set by the platform). Self-hosted, the entry added by the nearest trusted
 * proxy: `DIALMADE_TRUSTED_PROXY_HOPS` from the end (default 1, one reverse proxy; with 0 the header is
 * ignored and every client shares one bucket).
 */
export function clientIp(headers: Headers, env: Env = process.env): string {
  if (env.VERCEL) return headers.get("x-real-ip")?.trim() || "unknown";
  const raw = env.DIALMADE_TRUSTED_PROXY_HOPS?.trim();
  const hops = raw ? Number(raw) : 1;
  if (!Number.isInteger(hops) || hops <= 0) return "unknown";
  const chain = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return chain[chain.length - hops] ?? "unknown";
}
