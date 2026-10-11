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
  type DirectionStyle,
  type MessageContent,
  type RenderBrandInput,
  type RenderScreenInput,
} from "./prompt";
import { AI_PAGE_SYSTEM_PROMPT, pageBlockMessage, pageScreenMessage } from "./pagePrompt";
import { BlockStreamParser, type StreamBlock } from "./stream";
import { pageScreenMaxTokens, tierSettings, type AiRenderTier } from "./tier";
import { FRONTEND_DESIGN_GUIDANCE } from "./guidance/frontendDesign";

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
  /** «Maqueta · Presentable · Producto final»: the output room and the quality brief (the caller sets `effort`). */
  tier?: AiRenderTier;
};

export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

const SYSTEM: Anthropic.Beta.Messages.BetaTextBlockParam[] = [{ type: "text", text: AI_RENDER_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }];
const PAGE_SYSTEM: Anthropic.Beta.Messages.BetaTextBlockParam[] = [{ type: "text", text: AI_PAGE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }];

/** Page mode writes a whole page (≈ 8–10k tokens of HTML and CSS) and thinks before it: it needs this room and effort. */
export const PAGE_SCREEN_MAX_TOKENS = 48_000;
/** «Maqueta» in page mode also reads Anthropic's frontend-design guidance (./guidance): it lifted Haiku in the duel. */
const PAGE_SYSTEM_MOCKUP: Anthropic.Beta.Messages.BetaTextBlockParam[] = [{ type: "text", text: `${AI_PAGE_SYSTEM_PROMPT}\n\n${FRONTEND_DESIGN_GUIDANCE}`, cache_control: { type: "ephemeral" } }];
const pageSystem = (tier: AiRenderTier | undefined) => ((tier ?? "mockup") === "mockup" ? PAGE_SYSTEM_MOCKUP : PAGE_SYSTEM);
export const PAGE_BLOCK_MAX_TOKENS = 12_000;
const pageEffort = (effort: CallOptions["effort"]): CallOptions["effort"] => (effort === "low" ? "medium" : effort);

const content = (blocks: MessageContent): Anthropic.Beta.Messages.BetaTextBlockParam[] =>
  blocks.map((block) => ({ type: "text", text: block.text, ...(block.cache && { cache_control: { type: "ephemeral" as const } }) }));

type ImageBlock = Anthropic.Beta.Messages.BetaImageBlockParam;

function base(
  options: CallOptions,
  maxTokens: number,
  user: MessageContent,
  format?: Anthropic.Beta.Messages.BetaJSONOutputFormat,
  images: ImageBlock[] = [],
  system: Anthropic.Beta.Messages.BetaTextBlockParam[] = SYSTEM,
): Params {
  return {
    model: options.model,
    max_tokens: maxTokens,
    system,
    // Images before the text that talks about them.
    messages: [{ role: "user", content: [...images, ...content(user)] }],
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
  style: DirectionStyle = {},
): Params {
  const images: ImageBlock[] = (style.images ?? []).map((image) => ({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } }));
  return base(
    options,
    DIRECTION_MAX_TOKENS,
    directionMessage(brand, candidates, locale, screens, style),
    {
      type: "json_schema",
      schema: directionSchema(candidates, { references: images.length > 0, concept: !!style.context && Object.keys(style.context).length > 0 }) as unknown as Record<string, unknown>,
    },
    images,
  );
}

export const screenParams = (options: CallOptions, brand: RenderBrandInput, direction: DirectionForPrompt, screen: RenderScreenInput): Params =>
  screen.mode === "page"
    ? base(
        { ...options, effort: pageEffort(options.effort) },
        pageScreenMaxTokens(options.tier),
        pageScreenMessage(brand, direction, screen, { ...(options.tier && { tier: options.tier }) }),
        undefined,
        [],
        pageSystem(options.tier),
      )
    : base(options, options.tier ? tierSettings(options.tier).screenMaxTokens : SCREEN_MAX_TOKENS, screenMessage(brand, direction, screen, { ...(options.tier && { tier: options.tier }) }));

export const blockParams = (options: CallOptions, brand: RenderBrandInput, direction: DirectionForPrompt, input: BlockActionInput): Params =>
  input.screen.mode === "page"
    ? base(
        { ...options, effort: pageEffort(options.effort) },
        Math.max(PAGE_BLOCK_MAX_TOKENS, tierSettings(options.tier).blockMaxTokens),
        pageBlockMessage(brand, direction, { ...input, pageCss: input.pageCss ?? "" }, options.tier),
        undefined,
        [],
        pageSystem(options.tier),
      )
    : base(options, options.tier ? tierSettings(options.tier).blockMaxTokens : BLOCK_MAX_TOKENS, blockMessage(brand, direction, input, options.tier));

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
export function parseDirectionAnswer(
  raw: unknown,
  candidates: DirectionCandidates,
): { axes: AiAxes; moves: string[]; rationale: string; references?: string; themeId?: string; concept?: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const answer = raw as { axes?: Record<string, unknown>; moves?: unknown; rationale?: unknown; references?: unknown; theme?: unknown; concept?: unknown };
  const axes = {} as Record<string, string>;
  for (const axis of AI_AXIS_NAMES) {
    const value = answer.axes?.[axis];
    const allowed = candidates.axes[axis] as readonly string[];
    axes[axis] = typeof value === "string" && allowed.includes(value) ? value : allowed[0]!;
  }
  const moves = Array.isArray(answer.moves) ? answer.moves.filter((move): move is string => typeof move === "string" && candidates.moves.includes(move)).slice(0, 3) : [];
  const rationale = typeof answer.rationale === "string" ? answer.rationale.replace(/\s+/g, " ").trim().slice(0, 280) : "";
  const references = typeof answer.references === "string" ? answer.references.replace(/\s+/g, " ").trim().slice(0, 400) : "";
  const concept = typeof answer.concept === "string" ? answer.concept.replace(/\s+/g, " ").trim().slice(0, 500) : "";
  // Only a variant the code offered counts; "none" or anything else keeps the plain style.
  const themeId = typeof answer.theme === "string" && candidates.themes.includes(answer.theme) ? answer.theme : "";
  return { axes: axes as AiAxes, moves: moves.length > 0 ? moves : candidates.moves.slice(0, 3), rationale, ...(references && { references }), ...(themeId && { themeId }), ...(concept && { concept }) };
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
  /**
   * The response began (`message_start`): the prompt was read, so its cache prefix exists from now on. The callers
   * start the other screens of a session after it, so they read the cache instead of writing it again.
   */
  onStart?: () => void;
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
  let started = false;
  for await (const event of stream) {
    if (!started) {
      started = true;
      callbacks.onStart?.();
    }
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
