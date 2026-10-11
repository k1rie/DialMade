// Server only. «Diseño con IA» under the free-tier policy (spec §5.2): ONE free use opens a design session
// (POST /api/ai/render/session); every paid call inside it (the art direction, each screen, each block action)
// presents the session id, reserves its own worst case against the global monthly budget (no other free use), runs
// once and is settled at its real cost. Built on ../access (device cookie, IP hash, ledger, error mapping) and
// ../pricing. A failed screen or action (API error, refusal, no root at all) gives its slot back, up to the kind's max
// per session.
import type Anthropic from "@anthropic-ai/sdk";
import type { AiRenderTier } from "@dialmade/doc";
import {
  DIRECTION_MAX_TOKENS,
  directionCandidates,
  tierSettings,
  type RenderScreenInput,
} from "@dialmade/ai-render";
import { RenderOutputError, blockParams, createDirection, directionParams, screenParams, streamBlocks } from "@dialmade/ai-render/anthropic";
import AnthropicSdk from "@anthropic-ai/sdk";
import {
  AI_COUNT_TIMEOUT_MS,
  AI_GENERATE_TIMEOUT_MS,
  aiFailure,
  aiFailureFromError,
  closeSafely,
  hostedOff,
  isHttpError,
  limitFailure,
  type AiBudgetDeps,
  type AiCaller,
  type AiFailure,
} from "../access";
import { AI_SESSION_ACTIONS, AI_SESSION_DIRECTIONS, AI_SESSION_TTL_SECONDS, supportsDefaultFallbacks, supportsEffort } from "../config";
import { AiOutputError } from "../errors";
import { getAiLedger } from "../getAiLedger";
import {
  freeUsesLeft,
  remainingUsd,
  type AiLedger,
  type AiLedgerUsage,
  type AiSessionCounters,
  type AiSessionKind,
  type AiSessionLedger,
  type AiSessionRefusal,
} from "../ledger";
import { maxRequestCostUsd, messageCostUsd, messageTokens, roundUsd } from "../pricing";
import { readAiServerConfig, type AiServerConfig } from "../serverConfig";
import {
  encodeSse,
  styleOf,
  type RenderApiError,
  type RenderBlockBody,
  type RenderBlockSuccess,
  type RenderDirectionSuccess,
  type RenderRequestBody,
  type RenderSessionBody,
  type RenderSessionSuccess,
  type RenderUsage,
} from "./api";

/** Input tokens assumed when checking that a whole session fits the budget (before any count_tokens): the contract, the art direction and the screen with its ≈ 12k tokens of reference blocks. */
const TYPICAL_SESSION_INPUT_TOKENS = 24_000;

/**
 * `config.freeModel` is the model of the call (a full-access account may pick another, ./route); `tier` its finish,
 * `mockup` by default (the only one the free tier runs).
 */
export type RenderContext = AiBudgetDeps & { caller: AiCaller | null; tier?: AiRenderTier };

/**
 * Upstream time of one call per finish. The free tier keeps 45 s (Haiku at «Maqueta»); a full-access account gets more
 * because it may pick Opus 5.5, measured at ≈ 90 s (Presentable) and ≈ 140 s (Producto final) for a 7-block landing.
 * They stay under the routes' `maxDuration` (300 s).
 */
export const RENDER_TIER_TIMEOUT_MS: Readonly<Record<AiRenderTier, number>> = { mockup: 120_000, presentable: 240_000, final: 280_000 };

const generateTimeout = (context: RenderContext): number =>
  context.caller?.fullAccess ? RENDER_TIER_TIMEOUT_MS[context.tier ?? "mockup"] : AI_GENERATE_TIMEOUT_MS;
export type RenderFailure = { ok: false; status: number; body: RenderApiError; headers?: Record<string, string> };
export type RenderResult<T> = { ok: true; status: 200; body: T } | RenderFailure;

type Ready = { config: AiServerConfig; ledger: AiLedger & { sessions: AiSessionLedger }; caller: AiCaller; client: Anthropic; now: Date };

function prepare(context: RenderContext): Ready | AiFailure {
  const config = context.config ?? readAiServerConfig();
  const ledger = context.ledger === undefined ? getAiLedger(config, context.env) : context.ledger;
  const off = hostedOff(config, ledger, context.caller);
  if (off) return off;
  if (!ledger?.sessions || !context.caller) return aiFailure(503, "ai-not-configured", "The ledger has no design sessions");
  const client = context.client ?? new AnthropicSdk({ apiKey: config.apiKey, maxRetries: 0 });
  return { config, ledger: ledger as Ready["ledger"], caller: context.caller, client, now: context.now ?? new Date() };
}

/** Like BYOK (./byok `callOptions`): above `mockup` the tier sets the effort, the output room and the quality brief. */
const callOptions = (config: AiServerConfig, tier: AiRenderTier = "mockup") => ({
  model: config.freeModel,
  effort: tier === "mockup" ? config.effort : tierSettings(tier).effort,
  fallbacks: supportsDefaultFallbacks(config.freeModel),
  effortSupported: supportsEffort(config.freeModel),
  ...(tier !== "mockup" && { tier }),
});

/** Worst case of a whole generate (direction + `screens`), checked against the budget when the session opens. */
export function sessionWorstCaseUsd(model: string, screens: number, tier: AiRenderTier = "mockup"): number {
  const fallbacks = supportsDefaultFallbacks(model);
  const one = (maxOutputTokens: number) => maxRequestCostUsd({ model, inputTokens: TYPICAL_SESSION_INPUT_TOKENS, maxOutputTokens, fallbacks });
  return roundUsd(one(DIRECTION_MAX_TOKENS) + screens * one(tierSettings(tier).screenMaxTokens));
}

/** POST /api/ai/render/session. */
export async function openRenderSession(body: RenderSessionBody, context: RenderContext): Promise<RenderResult<RenderSessionSuccess>> {
  const ready = prepare(context);
  if ("ok" in ready) return ready;
  const { config, ledger, caller, now } = ready;
  try {
    const outcome = await ledger.sessions.openSession({
      deviceId: caller.deviceId,
      ipHash: caller.ipHash,
      now,
      monthlyBudgetUsd: config.monthlyBudgetUsd,
      freeUsesPerMonth: config.freeUsesPerMonth,
      maxRequestsPerIpPerDay: config.maxRequestsPerIpPerDay,
      model: config.freeModel,
      amountUsd: sessionWorstCaseUsd(config.freeModel, body.screens, context.tier),
      ttlSeconds: AI_SESSION_TTL_SECONDS,
      directions: AI_SESSION_DIRECTIONS,
      screens: body.screens,
      actions: AI_SESSION_ACTIONS,
    });
    if (!outcome.ok) return limitFailure(outcome.reason, outcome.usage, config, now);
    return {
      ok: true,
      status: 200,
      body: {
        sessionId: outcome.sessionId,
        session: outcome.session,
        freeUsesRemaining: freeUsesLeft(outcome.usage, config.freeUsesPerMonth),
        freeUsesTotal: config.freeUsesPerMonth,
        remainingBudgetUsd: roundUsd(remainingUsd(outcome.usage, config.monthlyBudgetUsd)),
      },
    };
  } catch (error) {
    return aiFailureFromError(error);
  }
}

const usageOf = (message: Anthropic.Beta.Messages.BetaMessage, model: string): RenderUsage => ({
  model: message.model,
  ...messageTokens(message),
  cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
  costUsd: roundUsd(messageCostUsd(message, model)),
});

function sessionRefusal(reason: string, session?: AiSessionCounters): RenderFailure {
  if (reason === "not-found") return { ok: false, status: 404, body: { code: "session-not-found", message: "No such design session for this device" } };
  if (reason === "expired") return { ok: false, status: 410, body: { code: "session-expired", message: "The design session expired", ...(session && { session }) } };
  return { ok: false, status: 402, body: { code: "session-exhausted", message: `The design session has no ${reason.replace("-exhausted", "")} left`, ...(session && { session }) } };
}

type SessionCall = { reservationId: string; session: AiSessionCounters; maxCostUsd: number; ready: Ready };

/** A refused peek or reserve, as the route's answer. */
function sessionOutcomeFailure(
  outcome: { reason: AiSessionRefusal | "budget-exceeded"; session?: AiSessionCounters; usage?: AiLedgerUsage },
  config: AiServerConfig,
): RenderFailure {
  if (outcome.reason === "budget-exceeded") {
    return aiFailure(402, "budget-exceeded", "The monthly AI budget cannot pay for this call", {
      ...(outcome.usage && { remainingBudgetUsd: roundUsd(remainingUsd(outcome.usage, config.monthlyBudgetUsd)) }),
    });
  }
  return sessionRefusal(outcome.reason, outcome.session);
}

/**
 * The session is checked first (a read, no upstream work: a random or expired session id never reaches Anthropic),
 * then count_tokens (free) → the worst case → one slot of the session and its reservation (checked again, atomically).
 */
async function reserveCall(
  context: RenderContext,
  sessionId: string,
  kind: AiSessionKind,
  params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming,
): Promise<SessionCall | RenderFailure> {
  const ready = prepare(context);
  if ("ok" in ready) return ready;
  const { config, ledger, caller, client, now } = ready;
  try {
    const peek = await ledger.sessions.peekSession({ sessionId, deviceId: caller.deviceId, kind, monthlyBudgetUsd: config.monthlyBudgetUsd, now });
    if (!peek.ok) return sessionOutcomeFailure(peek, config);
  } catch (error) {
    return aiFailureFromError(error);
  }
  let maxCostUsd: number;
  try {
    // count_tokens takes neither the output cap nor the refusal fallbacks (400 «fallbacks: Extra inputs are not
    // permitted», Sonnet/Opus only: Haiku sends none).
    const { max_tokens: maxTokens, ...countable } = params as typeof params & { fallbacks?: unknown };
    delete countable.fallbacks;
    delete countable.betas;
    const counted = await client.beta.messages.countTokens(countable as Anthropic.Beta.Messages.MessageCountTokensParams, {
      timeout: AI_COUNT_TIMEOUT_MS,
      maxRetries: 0,
      ...(context.signal && { signal: context.signal }),
    });
    maxCostUsd = maxRequestCostUsd({ model: config.freeModel, inputTokens: counted.input_tokens, maxOutputTokens: maxTokens, fallbacks: supportsDefaultFallbacks(config.freeModel) });
  } catch (error) {
    return aiFailureFromError(error);
  }
  try {
    const outcome = await ledger.sessions.reserveInSession({ sessionId, deviceId: caller.deviceId, kind, model: config.freeModel, amountUsd: maxCostUsd, monthlyBudgetUsd: config.monthlyBudgetUsd, now });
    if (!outcome.ok) return sessionOutcomeFailure(outcome, config);
    return { reservationId: outcome.reservationId, session: outcome.session, maxCostUsd, ready };
  } catch (error) {
    return aiFailureFromError(error);
  }
}

/**
 * Settles a finished, failed or unknown call, and gives a failed screen/action its slot back. The ledger caps the
 * refunds per kind at the kind's max, so an answer that is billed but never usable (e.g. «reply with plain text») can
 * not be looped on one free use.
 */
async function closeCall(call: SessionCall, kind: AiSessionKind, sessionId: string, outcome: { costUsd: number } | { error: unknown }): Promise<AiSessionCounters> {
  const { ledger, caller, now } = call.ready;
  if ("costUsd" in outcome) {
    await closeSafely(() => ledger.settle(call.reservationId, outcome.costUsd, now));
    return call.session;
  }
  const { error } = outcome;
  if (error instanceof RenderOutputError && error.response) {
    const billed = messageCostUsd(error.response, call.ready.config.freeModel);
    await closeSafely(() => ledger.settle(call.reservationId, billed, now));
  } else if (isHttpError(error)) {
    await closeSafely(() => ledger.release(call.reservationId, now));
  } else {
    // Timeout, network or a cut stream: the outcome is unknown, keep the worst case.
    await closeSafely(() => ledger.settle(call.reservationId, call.maxCostUsd, now));
  }
  const refunded = await ledger.sessions.refundSession(sessionId, caller.deviceId, kind, now).catch(() => null);
  return refunded ?? call.session;
}

function renderFailureFromError(error: unknown): RenderFailure {
  if (error instanceof RenderOutputError) {
    const code = error.code === "refused" ? "refused" : "invalid-response";
    return aiFailureFromError(new AiOutputError(code, error.message));
  }
  return aiFailureFromError(error);
}

/** POST /api/ai/render {task: "direction"}: structured output, JSON answer. */
export async function renderDirection(body: Extract<RenderRequestBody, { task: "direction" }>, context: RenderContext): Promise<RenderResult<RenderDirectionSuccess>> {
  const config = context.config ?? readAiServerConfig();
  const candidates = directionCandidates(body.seed, body.recipeId, body.chip);
  // The art direction stays at `mockup`, whatever the finish (as in BYOK).
  const params = directionParams(callOptions(config), body.brand, candidates, body.locale, body.screens, styleOf(body));
  const call = await reserveCall({ ...context, config }, body.sessionId, "direction", params);
  if ("ok" in call) return call;
  try {
    const { answer, message } = await createDirection(call.ready.client, params, candidates, { timeout: generateTimeout(context), maxRetries: 0 });
    const usage = usageOf(message, config.freeModel);
    const session = await closeCall(call, "direction", body.sessionId, { costUsd: usage.costUsd });
    return { ok: true, status: 200, body: { direction: answer, usage, session } };
  } catch (error) {
    await closeCall(call, "direction", body.sessionId, { error });
    return renderFailureFromError(error);
  }
}

/**
 * POST /api/ai/render {task: "screen"}: the budget checks answer as JSON errors; once the call is reserved the
 * answer is an SSE stream. The paid call runs to the end even if the client goes away (spec §5.3 [C8]: free tier
 * cancel = «ya se pagó esta pantalla»), and is settled at its real cost.
 */
export async function renderScreen(body: Extract<RenderRequestBody, { task: "screen" }>, context: RenderContext): Promise<RenderResult<ReadableStream<Uint8Array>>> {
  const config = context.config ?? readAiServerConfig();
  const screen: RenderScreenInput = body.screen;
  const params = screenParams(callOptions(config, context.tier), body.brand, body.direction, screen);
  const call = await reserveCall({ ...context, config }, body.sessionId, "screen", params);
  if ("ok" in call) return call;
  const encoder = new TextEncoder();
  const expected = screen.blocks.map((block) => block.id);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: Parameters<typeof encodeSse>[0]) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(encodeSse(event)));
        } catch {
          open = false; // the client left; the call goes on and is settled
        }
      };
      let lastProgress = 0;
      try {
        const result = await streamBlocks(
          call.ready.client,
          params,
          expected,
          {
            // The first event: the cache prefix is written, the client may start the session's other screens.
            onStart: () => send({ type: "progress", received: 0 }),
            onBlock: (block) => send({ type: "block", ...block }),
            onProgress: (received) => {
              if (received - lastProgress < 2048) return;
              lastProgress = received;
              send({ type: "progress", received });
            },
          },
          { timeout: generateTimeout(context), maxRetries: 0 },
        );
        const usage = usageOf(result.message, config.freeModel);
        const known = result.blocks.some((block) => block.blockId !== null && expected.includes(block.blockId));
        const session = known
          ? await closeCall(call, "screen", body.sessionId, { costUsd: usage.costUsd })
          : await closeCall(call, "screen", body.sessionId, { error: new RenderOutputError("invalid-response", "No block roots", result.message) });
        send({ type: "usage", usage });
        if (!known) send({ type: "error", error: { code: "invalid-response", message: "The answer had no block of this screen" } });
        send({ type: "done", session });
      } catch (error) {
        const session = await closeCall(call, "screen", body.sessionId, { error });
        send({ type: "error", error: renderFailureFromError(error).body });
        send({ type: "done", session });
      } finally {
        if (open) controller.close();
      }
    },
  });
  return { ok: true, status: 200, body: stream };
}

/** POST /api/ai/render/block: «Otra versión» / «Pedir cambio» (one session action), JSON answer with the raw root. */
export async function renderBlock(body: RenderBlockBody, context: RenderContext): Promise<RenderResult<RenderBlockSuccess>> {
  const config = context.config ?? readAiServerConfig();
  const params = blockParams(callOptions(config, context.tier), body.brand, body.direction, {
    screen: body.screen,
    block: body.block,
    html: body.html,
    action: body.action.kind === "reroll" ? body.action : { kind: "change", request: body.action.request, ...(body.action.target && { target: body.action.target }) },
  });
  const call = await reserveCall({ ...context, config }, body.sessionId, "action", params);
  if ("ok" in call) return call;
  try {
    const result = await streamBlocks(call.ready.client, params, [body.block.id], {}, { timeout: generateTimeout(context), maxRetries: 0 });
    const usage = usageOf(result.message, config.freeModel);
    const root = result.blocks.find((block) => block.blockId === body.block.id) ?? result.blocks[0] ?? null;
    if (!root) {
      const session = await closeCall(call, "action", body.sessionId, { error: new RenderOutputError("invalid-response", "No root", result.message) });
      return { ok: false, status: 502, body: { code: "invalid-response", message: "The answer had no block", session } };
    }
    const session = await closeCall(call, "action", body.sessionId, { costUsd: usage.costUsd });
    return { ok: true, status: 200, body: { html: root.html, usage, session } };
  } catch (error) {
    const session = await closeCall(call, "action", body.sessionId, { error });
    const failure = renderFailureFromError(error);
    return { ...failure, body: { ...failure.body, session } };
  }
}

/** JSON answer of a render route (never cached; carries the device cookie when new). */
export function renderJsonResponse(result: { status: number; body: unknown; headers?: Record<string, string> }, caller: AiCaller | null): Response {
  const headers = new Headers({ "Cache-Control": "no-store", ...result.headers });
  if (caller?.setCookie) headers.append("Set-Cookie", caller.setCookie);
  return Response.json(result.body, { status: result.status, headers });
}

export function renderStreamResponse(stream: ReadableStream<Uint8Array>, caller: AiCaller | null): Response {
  const headers = new Headers({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" });
  if (caller?.setCookie) headers.append("Set-Cookie", caller.setCookie);
  return new Response(stream, { status: 200, headers });
}
