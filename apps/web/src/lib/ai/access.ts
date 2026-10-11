// Server only. Access policy of the hosted AI, shared by every /api/ai/* route (copy, fingerprint):
//
//   free tier (DIALMADE_AI_FREE_USES_PER_MONTH per device per month, DIALMADE_AI_FREE_MODEL)
//   → then 402 free-tier-exhausted, and the UI offers BYOK or «Copiar prompt para mi Claude».
//
// Every call: device cookie + salted IP hash → pre-check of the ledger → the task's `estimate`
// (count_tokens, free) → atomic reservation of that worst case (one free use, one IP request) → the
// task's single paid `run` → settle with the real usage (or release when the API did not bill it).
//
// A new route only writes its task:
//
//   export async function POST(request: Request) {
//     const body = …validate…;
//     return withAiBudget(request, {
//       estimate: async ({ client, model, effort, requestOptions }) => {
//         const inputTokens = (await client.beta.messages.countTokens({ model, …same request… }, requestOptions)).input_tokens;
//         return maxRequestCostUsd({ model, inputTokens, maxOutputTokens: MAX, fallbacks: supportsDefaultFallbacks(model) });
//       },
//       run: async ({ client, model, effort, requestOptions }) => {
//         const message = await client.beta.messages.create({ model, max_tokens: MAX, … }, requestOptions);
//         const costUsd = messageCostUsd(message, model);
//         // a refusal or an unusable answer: throw new AiOutputError("refused" | "invalid-response", msg, { model: message.model, costUsd })
//         return { data: { …fields of the JSON answer… }, costUsd };
//       },
//     });
//   }
//
// The JSON answer is `data` plus { costUsd, remainingBudgetUsd, freeUsesRemaining, freeUsesTotal }; errors
// are `AiApiError` bodies. `run` gets no abort signal and no retries: once the paid call starts it runs
// to the end and is settled at its real cost.
import Anthropic from "@anthropic-ai/sdk";
import type { AiApiError, AiApiErrorCode, AiStatusResponse } from "./api";
import { MAX_OUTPUT_TOKENS, supportsDefaultFallbacks, type AiEffort } from "./config";
import { deviceSecretFor, hashIp, resolveDevice } from "./device";
import { AiOutputError } from "./errors";
import { getAiLedger } from "./getAiLedger";
import {
  AiLedgerError,
  freeUsesLeft,
  limitReason,
  remainingUsd,
  type AiLedger,
  type AiLedgerUsage,
  type AiLimitReason,
  type AiReserveOutcome,
} from "./ledger";
import { fullAccessConfig, hasFullAccess } from "./fullAccess";
import { maxRequestCostUsd, roundUsd } from "./pricing";
import { clientIp, readAiServerConfig, type AiServerConfig, type Env } from "./serverConfig";

/** Wall clock of the two upstream calls; together they stay under the routes' `maxDuration` (60 s). */
export const AI_COUNT_TIMEOUT_MS = 10_000;
export const AI_GENERATE_TIMEOUT_MS = 45_000;
/** Prompt size assumed by /api/ai/status for «can the budget still pay for a request?». */
const TYPICAL_INPUT_TOKENS = 8_000;

/** Who is asking: the anonymous device and the salted hash of its IP (never the IP itself). */
export type AiCaller = {
  deviceId: string;
  ipHash: string;
  /** `Set-Cookie` for a new or rotated device cookie; `aiJsonResponse` sends it. */
  setCookie: string | null;
  /** The signed-in account has «Acceso completo» (./fullAccess): its own limits, every tier and model of «Diseño con IA». */
  fullAccess?: boolean;
};

/** `null` when no secret can sign the cookie (production without DIALMADE_DEVICE_ID_SECRET). */
export function resolveAiCaller(request: Request, config: AiServerConfig = readAiServerConfig(), env: Env = process.env, now = new Date()): AiCaller | null {
  const secret = deviceSecretFor(config);
  if (!secret) return null;
  const device = resolveDevice(request.headers.get("cookie"), secret, { secure: config.production });
  return { ...device, ipHash: hashIp(clientIp(request.headers, env), secret, now) };
}

/**
 * `resolveAiCaller` plus the account: a full-access account gets its flag and the config with its limits. Every hosted
 * route resolves the caller through this one.
 */
export async function resolveAiAccess(request: Request, config: AiServerConfig = readAiServerConfig(), env: Env = process.env, now = new Date()): Promise<{ caller: AiCaller | null; config: AiServerConfig }> {
  const caller = resolveAiCaller(request, config, env, now);
  if (!caller || !(await hasFullAccess(request))) return { caller, config };
  return { caller: { ...caller, fullAccess: true }, config: fullAccessConfig(config) };
}

/** Pass as the SDK's per-request options: no retries, a timeout, and (estimate only) the client's abort signal. */
export type AiRequestOptions = { signal?: AbortSignal; timeout: number; maxRetries: 0 };

export type AiCallInput = {
  client: Anthropic;
  /** The free tier's model. With claude-haiku-5-5, `supportsDefaultFallbacks` is false: send no fallbacks. */
  model: string;
  effort: AiEffort;
  requestOptions: AiRequestOptions;
};

export type AiBudgetTask<T extends object> = {
  /** Worst-case USD of `run` (count_tokens, which also accepts images, + max_tokens at list price). */
  estimate: (input: AiCallInput) => Promise<number>;
  /** The single paid call. Throw `AiOutputError` with `response.costUsd` when the answer is unusable. */
  run: (input: AiCallInput) => Promise<{ data: T; costUsd: number }>;
};

export type AiBudgetDeps = {
  config?: AiServerConfig;
  /** Default: `getAiLedger(config)`. `null` = no ledger (hosted AI off). */
  ledger?: AiLedger | null;
  /** Injected in tests. */
  client?: Anthropic;
  /** Aborts only the free estimate. */
  signal?: AbortSignal;
  now?: Date;
  env?: Env;
};

export type AiFreeTierFields = {
  costUsd: number;
  remainingBudgetUsd: number;
  freeUsesRemaining: number;
  freeUsesTotal: number;
};

export type AiFailure = { ok: false; status: number; body: AiApiError; headers?: Record<string, string> };
export type AiSuccess<T extends object> = { ok: true; status: 200; body: T & AiFreeTierFields };
export type AiHostedResult<T extends object> = AiSuccess<T> | AiFailure;

export function aiFailure(status: number, code: AiApiErrorCode, message: string, extra: Omit<Partial<AiApiError>, "code" | "message"> = {}): AiFailure {
  return {
    ok: false,
    status,
    body: { code, message, ...extra },
    ...(extra.retryAfterSeconds !== undefined && { headers: { "Retry-After": String(extra.retryAfterSeconds) } }),
  };
}

/** SDK, output and ledger errors → HTTP answer. Checked from the most specific class to the base one. */
export function aiFailureFromError(error: unknown): AiFailure {
  if (error instanceof AiOutputError) return aiFailure(error.code === "refused" ? 422 : 502, error.code, error.message);
  if (error instanceof AiLedgerError) {
    console.error("[ai] ledger unavailable:", error.message);
    return aiFailure(503, "upstream-error", "The AI budget ledger is unavailable");
  }
  if (error instanceof Anthropic.APIUserAbortError) return aiFailure(499, "aborted", "Request aborted");
  if (error instanceof Anthropic.APIConnectionTimeoutError) return aiFailure(504, "network", "Anthropic API timed out");
  if (error instanceof Anthropic.APIConnectionError) return aiFailure(502, "network", "Could not reach the Anthropic API");
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    console.error("[ai] ANTHROPIC_API_KEY was rejected by the Anthropic API");
    return aiFailure(503, "ai-not-configured", "The server's AI key is not valid");
  }
  if (error instanceof Anthropic.NotFoundError) {
    console.error("[ai] the configured model was not found:", error.message);
    return aiFailure(503, "ai-not-configured", "The configured model does not exist");
  }
  if (error instanceof Anthropic.RateLimitError) {
    const header = error.headers.get("retry-after");
    const retry = header ? Number(header) : Number.NaN;
    return aiFailure(429, "rate-limited", "Anthropic API rate limit", Number.isFinite(retry) ? { retryAfterSeconds: retry } : {});
  }
  if (error instanceof Anthropic.InternalServerError) return aiFailure(503, "overloaded", "Anthropic API overloaded or failing");
  if (error instanceof Anthropic.BadRequestError) {
    console.error("[ai] Anthropic API rejected the request:", error.requestID, error.message);
    return aiFailure(502, "upstream-error", "The Anthropic API rejected the request");
  }
  if (error instanceof Anthropic.APIError) {
    console.error("[ai] Anthropic API error:", error.status, error.requestID);
    return aiFailure(502, "upstream-error", "Anthropic API error");
  }
  console.error("[ai] unexpected error:", error);
  return aiFailure(500, "upstream-error", "Unexpected error");
}

/** The API answered with an error status: the request was not billed. */
export const isHttpError = (error: unknown) =>
  error instanceof Anthropic.APIError && !(error instanceof Anthropic.APIUserAbortError) && !(error instanceof Anthropic.APIConnectionError);

const secondsToUtcMidnight = (now: Date) => {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
};

const freeCounters = (usage: AiLedgerUsage, config: AiServerConfig) => ({
  freeUsesRemaining: freeUsesLeft(usage, config.freeUsesPerMonth),
  freeUsesTotal: config.freeUsesPerMonth,
});

export function limitFailure(reason: AiLimitReason, usage: AiLedgerUsage, config: AiServerConfig, now: Date, amountUsd?: number): AiFailure {
  const counters = freeCounters(usage, config);
  if (reason === "free-tier-exhausted") {
    return aiFailure(402, "free-tier-exhausted", "This device used its free AI uses this month", { ...counters, remaining: 0, freeUsesRemaining: 0 });
  }
  if (reason === "daily-limit") {
    return aiFailure(429, "daily-limit", "Daily AI request limit reached for this network", { ...counters, retryAfterSeconds: secondsToUtcMidnight(now) });
  }
  const left = roundUsd(remainingUsd(usage, config.monthlyBudgetUsd));
  const message =
    amountUsd !== undefined && left > 0
      ? `This request could cost up to $${amountUsd.toFixed(4)} and the month has $${left.toFixed(4)} left`
      : "The monthly AI budget is spent";
  return aiFailure(402, "budget-exceeded", message, { ...counters, remainingBudgetUsd: left });
}

/** Settling must never turn a paid answer into an error: an unsettled reservation expires and is charged in full. */
export async function closeSafely(close: () => Promise<AiLedgerUsage | null>): Promise<AiLedgerUsage | null> {
  try {
    return await close();
  } catch (error) {
    console.error("[ai] could not close a reservation (it will expire, charged in full):", error instanceof Error ? error.message : error);
    return null;
  }
}

export function hostedOff(config: AiServerConfig, ledger: AiLedger | null, caller: AiCaller | null): AiFailure | null {
  if (!config.apiKey) return aiFailure(503, "ai-not-configured", "ANTHROPIC_API_KEY is not set");
  if (!ledger) {
    console.error("[ai] Hosted AI is off: outside development it needs the Supabase ledger (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY)");
    return aiFailure(503, "ai-not-configured", "The hosted AI needs a persistent budget ledger");
  }
  if (!caller) {
    console.error("[ai] Hosted AI is off: DIALMADE_DEVICE_ID_SECRET is not set (32+ characters)");
    return aiFailure(503, "ai-not-configured", "The hosted AI needs DIALMADE_DEVICE_ID_SECRET");
  }
  return null;
}

/** The policy without HTTP: for routes that build their own response, and for tests. */
export async function runWithAiBudget<T extends object>(caller: AiCaller | null, task: AiBudgetTask<T>, deps: AiBudgetDeps = {}): Promise<AiHostedResult<T>> {
  const config = deps.config ?? readAiServerConfig();
  const now = deps.now ?? new Date();
  const ledger = deps.ledger === undefined ? getAiLedger(config, deps.env) : deps.ledger;
  const off = hostedOff(config, ledger, caller);
  if (off || !ledger || !caller) return off ?? aiFailure(503, "ai-not-configured", "Hosted AI is off");

  const key = { deviceId: caller.deviceId, ipHash: caller.ipHash, now };
  const limits = {
    monthlyBudgetUsd: config.monthlyBudgetUsd,
    freeUsesPerMonth: config.freeUsesPerMonth,
    maxRequestsPerIpPerDay: config.maxRequestsPerIpPerDay,
  };

  let usage: AiLedgerUsage;
  try {
    usage = await ledger.usage(key);
  } catch (error) {
    return aiFailureFromError(error);
  }
  const early = limitReason(usage, limits);
  if (early) return limitFailure(early, usage, config, now);

  const client = deps.client ?? new Anthropic({ apiKey: config.apiKey, maxRetries: 0 });
  const call = { client, model: config.freeModel, effort: config.effort };

  let maxCostUsd: number;
  try {
    maxCostUsd = await task.estimate({
      ...call,
      requestOptions: { ...(deps.signal && { signal: deps.signal }), timeout: AI_COUNT_TIMEOUT_MS, maxRetries: 0 },
    });
  } catch (error) {
    return aiFailureFromError(error);
  }
  if (!Number.isFinite(maxCostUsd) || maxCostUsd < 0) {
    console.error("[ai] the task's estimate is not a cost ≥ 0");
    return aiFailure(500, "upstream-error", "Invalid cost estimate");
  }

  let reservation: AiReserveOutcome;
  try {
    reservation = await ledger.reserve({ ...key, ...limits, model: config.freeModel, amountUsd: maxCostUsd });
  } catch (error) {
    return aiFailureFromError(error);
  }
  if (!reservation.ok) return limitFailure(reservation.reason, reservation.usage, config, now, maxCostUsd);
  const { reservationId } = reservation;
  const counters = (after: AiLedgerUsage | null) => {
    const current = after ?? reservation.usage;
    return { remainingBudgetUsd: roundUsd(remainingUsd(current, config.monthlyBudgetUsd)), ...freeCounters(current, config) };
  };

  try {
    const { data, costUsd } = await task.run({ ...call, requestOptions: { timeout: AI_GENERATE_TIMEOUT_MS, maxRetries: 0 } });
    const cost = Number.isFinite(costUsd) && costUsd >= 0 ? costUsd : maxCostUsd;
    const after = await closeSafely(() => ledger.settle(reservationId, cost, now));
    return { ok: true, status: 200, body: { ...data, costUsd: roundUsd(cost), ...counters(after) } };
  } catch (error) {
    let after: AiLedgerUsage | null;
    if (error instanceof AiOutputError && error.response) {
      const billed = error.response.costUsd;
      after = await closeSafely(() => ledger.settle(reservationId, billed, now));
    } else if (isHttpError(error)) {
      after = await closeSafely(() => ledger.release(reservationId, now));
    } else {
      // Timeout or network failure after sending: the outcome is unknown, keep the worst case.
      after = await closeSafely(() => ledger.settle(reservationId, maxCostUsd, now));
    }
    const failure = aiFailureFromError(error);
    const { freeUsesRemaining, freeUsesTotal } = counters(after);
    return { ...failure, body: { ...failure.body, freeUsesRemaining, freeUsesTotal } };
  }
}

/** JSON answer of a hosted AI route: never cached, and it carries the device cookie when new. */
export function aiJsonResponse(result: { status: number; body: unknown; headers?: Record<string, string> }, caller: AiCaller | null): Response {
  const headers = new Headers({ "Cache-Control": "no-store", ...result.headers });
  if (caller?.setCookie) headers.append("Set-Cookie", caller.setCookie);
  return Response.json(result.body, { status: result.status, headers });
}

/** Route helper: resolves the device and the IP, runs `task` under the policy and answers. */
export async function withAiBudget<T extends object>(request: Request, task: AiBudgetTask<T>, deps: AiBudgetDeps = {}): Promise<Response> {
  const { caller, config } = await resolveAiAccess(request, deps.config ?? readAiServerConfig(), deps.env, deps.now);
  const result = await runWithAiBudget(caller, task, { ...deps, config, signal: deps.signal ?? request.signal });
  return aiJsonResponse(result, caller);
}

/** Reservation of a typical copy request, so the UI stops offering the hosted AI before it can only answer 402. */
export const typicalRequestCostUsd = (model: string): number =>
  roundUsd(maxRequestCostUsd({ model, inputTokens: TYPICAL_INPUT_TOKENS, maxOutputTokens: MAX_OUTPUT_TOKENS, fallbacks: supportsDefaultFallbacks(model) }));

/** GET /api/ai/status for this device. A ledger that cannot be read counts as «off» (fails closed). */
export async function aiStatus(caller: AiCaller | null, deps: Pick<AiBudgetDeps, "config" | "ledger" | "now" | "env"> = {}): Promise<AiStatusResponse> {
  const config = deps.config ?? readAiServerConfig();
  const ledger = deps.ledger === undefined ? getAiLedger(config, deps.env) : deps.ledger;
  const base = {
    model: config.model,
    freeModel: config.freeModel,
    freeUsesTotal: config.freeUsesPerMonth,
    minRequestUsd: typicalRequestCostUsd(config.freeModel),
  };
  const off: AiStatusResponse = { ...base, configured: false, remainingBudgetUsd: null, freeUsesRemaining: 0, fullAccess: false };
  if (!config.apiKey || !ledger || !caller) return off;
  try {
    const usage = await ledger.usage({ deviceId: caller.deviceId, ipHash: caller.ipHash, now: deps.now ?? new Date() });
    return {
      ...base,
      configured: true,
      remainingBudgetUsd: roundUsd(remainingUsd(usage, config.monthlyBudgetUsd)),
      freeUsesRemaining: freeUsesLeft(usage, config.freeUsesPerMonth),
      fullAccess: caller.fullAccess === true,
    };
  } catch (error) {
    console.error("[ai] status: ledger unavailable:", error instanceof Error ? error.message : error);
    return off;
  }
}

export async function aiStatusResponse(request: Request, deps: Pick<AiBudgetDeps, "config" | "ledger" | "now" | "env"> = {}): Promise<Response> {
  const { caller, config } = await resolveAiAccess(request, deps.config ?? readAiServerConfig(), deps.env, deps.now);
  return aiJsonResponse({ status: 200, body: await aiStatus(caller, { ...deps, config }) }, caller);
}
