// The Claude calls of «Diseño con IA», shared by the hosted routes (server), BYOK (browser) and the variety eval.
// Only the SDK's TYPES are imported: the caller passes its client (server key, or the user's key in the browser with
// `dangerouslyAllowBrowser`). Prompt caching: breakpoint 1 on the fixed `system`, breakpoint 2 on the document's art
// direction (5-minute TTL: a generation's screens start seconds apart). Thinking stays adaptive (Haiku 5.5 and
// Opus 5.5 cannot turn it off); `effort` bounds it.
import type Anthropic from "@anthropic-ai/sdk";
import type { AiAxes } from "@dialmade/doc";
import { AI_AXIS_NAMES } from "@dialmade/doc";
import type { DirectionCandidates } from "./direction";
import {
  AI_RENDER_SYSTEM_PROMPT,
  BLOCK_MAX_TOKENS,
  DIRECTION_MAX_TOKENS,
  MAX_SCREEN_BYTES,
  SCREEN_MAX_TOKENS,
  blockMessage,
  directionMessage,
  directionSchema,
  screenMessage,
  type BlockActionInput,
  type DirectionForPrompt,
  type MessageContent,
  type RenderBrandInput,
  type RenderScreenInput,
} from "./prompt";
import { BlockStreamParser, type StreamBlock } from "./stream";

type Params = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
type Message = Anthropic.Beta.Messages.BetaMessage;
type RequestOptions = { signal?: AbortSignal; timeout?: number; maxRetries?: number };

export type CallOptions = {
  model: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  /** `fallbacks: "default"` (server-side refusal fallback) where the model supports it. Not Haiku 5.5. */
  fallbacks?: boolean;
  /** `output_config.effort` errors on a few older models. */
  effortSupported?: boolean;
};

export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

const SYSTEM: Anthropic.Beta.Messages.BetaTextBlockParam[] = [{ type: "text", text: AI_RENDER_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }];

const content = (blocks: MessageContent): Anthropic.Beta.Messages.BetaTextBlockParam[] =>
  blocks.map((block) => ({ type: "text", text: block.text, ...(block.cache && { cache_control: { type: "ephemeral" as const } }) }));

function base(options: CallOptions, maxTokens: number, user: MessageContent, format?: Anthropic.Beta.Messages.BetaJSONOutputFormat): Params {
  return {
    model: options.model,
    max_tokens: maxTokens,
    system: SYSTEM,
    messages: [{ role: "user", content: content(user) }],
    ...((options.effortSupported !== false || format) && {
      output_config: { ...(options.effortSupported !== false && { effort: options.effort }), ...(format && { format }) },
    }),
    ...(options.fallbacks && { betas: [FALLBACK_BETA], fallbacks: "default" as const }),
  };
}

export function directionParams(
  options: CallOptions,
  brand: RenderBrandInput,
  candidates: DirectionCandidates,
  locale: "es" | "en",
  screens: { name: string; kind: string; blocks: string[] }[],
): Params {
  return base(options, DIRECTION_MAX_TOKENS, directionMessage(brand, candidates, locale, screens), {
    type: "json_schema",
    schema: directionSchema(candidates) as unknown as Record<string, unknown>,
  });
}

export const screenParams = (options: CallOptions, brand: RenderBrandInput, direction: DirectionForPrompt, screen: RenderScreenInput): Params =>
  base(options, SCREEN_MAX_TOKENS, screenMessage(brand, direction, screen));

export const blockParams = (options: CallOptions, brand: RenderBrandInput, direction: DirectionForPrompt, input: BlockActionInput): Params =>
  base(options, BLOCK_MAX_TOKENS, blockMessage(brand, direction, input));

/** The model answered, but not with something usable. `message` carries the billed usage. */
export class RenderOutputError extends Error {
  constructor(
    readonly code: "refused" | "invalid-response" | "too-large",
    message: string,
    readonly response?: Message,
  ) {
    super(message);
    this.name = "RenderOutputError";
  }
}

const textOf = (message: Message) => message.content.map((block) => (block.type === "text" ? block.text : "")).join("");

/** The model's pick, checked against the code's candidates (anything else falls back to the first candidate). */
export function parseDirectionAnswer(raw: unknown, candidates: DirectionCandidates): { axes: AiAxes; moves: string[]; rationale: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const answer = raw as { axes?: Record<string, unknown>; moves?: unknown; rationale?: unknown };
  const axes = {} as Record<string, string>;
  for (const axis of AI_AXIS_NAMES) {
    const value = answer.axes?.[axis];
    const allowed = candidates.axes[axis] as readonly string[];
    axes[axis] = typeof value === "string" && allowed.includes(value) ? value : allowed[0]!;
  }
  const moves = Array.isArray(answer.moves) ? answer.moves.filter((move): move is string => typeof move === "string" && candidates.moves.includes(move)).slice(0, 3) : [];
  const rationale = typeof answer.rationale === "string" ? answer.rationale.replace(/\s+/g, " ").trim().slice(0, 280) : "";
  return { axes: axes as AiAxes, moves: moves.length > 0 ? moves : candidates.moves.slice(0, 3), rationale };
}

/** The direction call (structured output). Throws the SDK's errors and `RenderOutputError`. */
export async function createDirection(client: Anthropic, params: Params, candidates: DirectionCandidates, requestOptions: RequestOptions = {}) {
  const message = await client.beta.messages.create(params, requestOptions);
  if (message.stop_reason === "refusal") throw new RenderOutputError("refused", "The model declined the request", message);
  let raw: unknown;
  try {
    raw = JSON.parse(textOf(message));
  } catch {
    throw new RenderOutputError("invalid-response", `No JSON answer (stop_reason: ${message.stop_reason})`, message);
  }
  const answer = parseDirectionAnswer(raw, candidates);
  if (!answer) throw new RenderOutputError("invalid-response", "Unusable direction", message);
  return { answer, message };
}

export type StreamCallbacks = {
  /** A root closed (raw HTML; sanitize it before anything else). */
  onBlock?: (block: StreamBlock) => void;
  /** Characters received so far. */
  onProgress?: (received: number) => void;
};

/**
 * One streamed call whose answer is HTML roots (a screen, or one block for «Otra versión» / «Pedir cambio»): every
 * root is handed to `onBlock` when it closes. Over `MAX_SCREEN_BYTES` the stream is cut (`too-large`, billed).
 * Resolves with the final message (usage) and every root.
 */
export async function streamBlocks(
  client: Anthropic,
  params: Params,
  expected: Iterable<string>,
  callbacks: StreamCallbacks = {},
  requestOptions: RequestOptions = {},
): Promise<{ message: Message; blocks: StreamBlock[] }> {
  const parser = new BlockStreamParser(new Set(expected));
  const blocks: StreamBlock[] = [];
  const emit = (found: StreamBlock[]) => {
    for (const block of found) {
      blocks.push(block);
      callbacks.onBlock?.(block);
    }
  };
  const stream = client.beta.messages.stream(params, requestOptions);
  let tooLarge = false;
  for await (const event of stream) {
    if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
    emit(parser.push(event.delta.text));
    callbacks.onProgress?.(parser.received);
    if (parser.received > MAX_SCREEN_BYTES) {
      tooLarge = true;
      stream.abort();
      break;
    }
  }
  if (tooLarge) {
    // An aborted stream has no final message: the caller settles the worst case.
    throw new RenderOutputError("too-large", `The answer passed ${MAX_SCREEN_BYTES} bytes`);
  }
  const message = await stream.finalMessage();
  emit(parser.end());
  if (message.stop_reason === "refusal" && blocks.length === 0) throw new RenderOutputError("refused", "The model declined the request", message);
  return { message, blocks };
}
