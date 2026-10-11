// BYOK for «Diseño con IA» (spec §5.3, §6.4): the browser calls api.anthropic.com with the user's key, with the same
// prompts, parser and output checks as the hosted routes (@dialmade/ai-render/anthropic). The key is passed in per
// call, used for one SDK client and dropped: it never reaches the Dialmade server, React state or storage. Cancel
// aborts the HTTP request for real (it is the user's money). Loaded on demand by ./transport.
import Anthropic from "@anthropic-ai/sdk";
import type { AiRenderTier } from "@dialmade/doc";
import { directionCandidates, tierSettings } from "@dialmade/ai-render";
import { RenderOutputError, blockParams, createDirection, directionParams, screenParams, streamBlocks, type CallOptions } from "@dialmade/ai-render/anthropic";
import { DEFAULT_AI_EFFORT, supportsDefaultFallbacks, supportsEffort } from "../config";
import { messageCostUsd, messageTokens, roundUsd } from "../pricing";
import { styleOf, type RenderApiError, type RenderStreamEvent, type RenderUsage } from "./api";
import { abortedError, enterScreen, type BlockBody, type DirectionBody, type ScreenBody, type TransportBlock, type TransportDirection, RenderTransportError } from "./transport";

/** Opus 5.5 is slower than the free tier's Haiku: a screen gets 3 minutes before the SDK gives up. */
export const BYOK_RENDER_TIMEOUT_MS = 180_000;
/**
 * A higher tier thinks before it writes: measured with Opus 5.5 (7-block landing), Presentable ≈ 90 s and Producto
 * final ≈ 140 s, so they get more room before the SDK gives up.
 */
export const BYOK_TIER_TIMEOUT_MS: Readonly<Record<AiRenderTier, number>> = { mockup: BYOK_RENDER_TIMEOUT_MS, presentable: 300_000, final: 420_000 };

export type ByokCall = { apiKey: string; model: string; signal?: AbortSignal; /** Default `mockup`. */ tier?: AiRenderTier };

/** The tier decides how much the model may think (`effort`) and the output room; `mockup` is the old `low`. */
export const callOptions = (model: string, tier: AiRenderTier = "mockup"): CallOptions => ({
  model,
  effort: tier === "mockup" ? DEFAULT_AI_EFFORT : tierSettings(tier).effort,
  fallbacks: supportsDefaultFallbacks(model),
  effortSupported: supportsEffort(model),
  ...(tier !== "mockup" && { tier }),
});

const client = (apiKey: string, tier: AiRenderTier = "mockup") => new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: BYOK_TIER_TIMEOUT_MS[tier] });

type Message = Anthropic.Beta.Messages.BetaMessage;

export const usageOf = (message: Message, model: string): RenderUsage => ({
  model: message.model,
  ...messageTokens(message),
  cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
  costUsd: roundUsd(messageCostUsd(message, model)),
});

/** SDK and output errors → the wire codes the hosted routes answer (the UI words them the same way). */
export function byokRenderError(error: unknown, signal?: AbortSignal): RenderApiError {
  if (signal?.aborted || error instanceof Anthropic.APIUserAbortError) return abortedError();
  if (error instanceof RenderOutputError) {
    return { code: error.code === "refused" ? "refused" : "invalid-response", message: error.message };
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) return { code: "network", message: "The Anthropic API timed out" };
  if (error instanceof Anthropic.APIConnectionError) return { code: "network", message: "Could not reach the Anthropic API" };
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return { code: "invalid-key", message: "The API key was rejected" };
  }
  if (error instanceof Anthropic.RateLimitError) return { code: "rate-limited", message: "Rate limited" };
  if (error instanceof Anthropic.InternalServerError) return { code: "overloaded", message: "Anthropic API overloaded" };
  if (error instanceof Anthropic.BadRequestError) return { code: "upstream-error", message: "The Anthropic API rejected the request" };
  if (error instanceof Anthropic.APIError) return { code: "upstream-error", message: "Anthropic API error" };
  return { code: "upstream-error", message: "Unexpected error" };
}

const requestOptions = (signal?: AbortSignal, tier: AiRenderTier = "mockup") => ({ timeout: BYOK_TIER_TIMEOUT_MS[tier], ...(signal && { signal }) });

export async function byokDirection(body: DirectionBody, call: ByokCall): Promise<TransportDirection> {
  const candidates = directionCandidates(body.seed, body.recipeId, body.chip);
  // The art direction is a short structured answer: it stays at low effort whatever the tier (more thinking could
  // spend its 1.5k output tokens before the JSON).
  const params = directionParams(callOptions(call.model), body.brand, candidates, body.locale, body.screens, styleOf(body));
  try {
    const { answer, message } = await createDirection(client(call.apiKey), params, candidates, requestOptions(call.signal));
    return { direction: answer, usage: usageOf(message, call.model), session: null };
  } catch (error) {
    throw new RenderTransportError(byokRenderError(error, call.signal));
  }
}

/** A push queue read as an async iterator (the SDK calls back; the transport yields). */
function channel<T>() {
  const items: T[] = [];
  let wake: (() => void) | null = null;
  let closed = false;
  return {
    push(item: T) {
      items.push(item);
      wake?.();
    },
    close() {
      closed = true;
      wake?.();
    },
    async *drain(): AsyncGenerator<T> {
      for (;;) {
        while (items.length > 0) yield items.shift()!;
        if (closed) return;
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        wake = null;
      }
    },
  };
}

/** One screen streamed from the browser. Leaving the loop early (or `signal`) aborts the request. */
export async function* byokScreen(body: ScreenBody, call: ByokCall): AsyncGenerator<RenderStreamEvent> {
  const controller = new AbortController();
  const forward = () => controller.abort();
  if (call.signal?.aborted) controller.abort();
  call.signal?.addEventListener("abort", forward, { once: true });
  const started = await enterScreen(body.sessionId, controller.signal);
  const events = channel<RenderStreamEvent>();
  const expected = body.screen.blocks.map((block) => block.id);
  let lastProgress = 0;
  const run = (async () => {
    if (controller.signal.aborted) throw new Anthropic.APIUserAbortError();
    const params = screenParams(callOptions(call.model, call.tier), body.brand, body.direction, body.screen);
    return streamBlocks(
      client(call.apiKey, call.tier),
      params,
      expected,
      {
        onStart: () => {
          started();
          events.push({ type: "progress", received: 0 });
        },
        onBlock: (block) => events.push({ type: "block", ...block }),
        onProgress: (received) => {
          // Every text delta calls it: keep one event per 2 KB, like the hosted route.
          if (received - lastProgress < 2048) return;
          lastProgress = received;
          events.push({ type: "progress", received });
        },
      },
      requestOptions(controller.signal, call.tier),
    );
  })().then(
    (result) => {
      const usage = usageOf(result.message, call.model);
      events.push({ type: "usage", usage });
      const known = result.blocks.some((block) => block.blockId !== null && expected.includes(block.blockId));
      if (!known) events.push({ type: "error", error: { code: "invalid-response", message: "The answer had no block of this screen" } });
    },
    (error: unknown) => {
      events.push({ type: "error", error: byokRenderError(error, controller.signal) });
    },
  );
  void run.finally(() => {
    started();
    events.push({ type: "done", session: null });
    events.close();
  });
  let finished = false;
  try {
    for await (const event of events.drain()) {
      // After «Cancelar» only the closing events go out, not what was already queued.
      if (controller.signal.aborted && event.type !== "error" && event.type !== "done") continue;
      yield event;
      if (event.type === "done") finished = true;
    }
  } finally {
    call.signal?.removeEventListener("abort", forward);
    if (!finished) controller.abort();
    started();
  }
}

export async function byokBlock(body: BlockBody, call: ByokCall): Promise<TransportBlock> {
  const params = blockParams(callOptions(call.model, call.tier), body.brand, body.direction, {
    screen: body.screen,
    block: body.block,
    html: body.html,
    action: body.action.kind === "reroll" ? body.action : { kind: "change", request: body.action.request, ...(body.action.target && { target: body.action.target }) },
  });
  try {
    const result = await streamBlocks(client(call.apiKey, call.tier), params, [body.block.id], {}, requestOptions(call.signal, call.tier));
    const root = result.blocks.find((block) => block.blockId === body.block.id) ?? result.blocks[0] ?? null;
    if (!root) throw new RenderOutputError("invalid-response", "The answer had no block", result.message);
    return { html: root.html, usage: usageOf(result.message, call.model), session: null };
  } catch (error) {
    throw new RenderTransportError(byokRenderError(error, call.signal));
  }
}
