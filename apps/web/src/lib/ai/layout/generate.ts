// The layout AI call, shared by the hosted route (./server) and BYOK (./browser). Imports the SDK types only; the
// client is passed in. Load it on the server or on demand in the browser.
import type Anthropic from "@anthropic-ai/sdk";
import { FALLBACK_BETA, supportsDefaultFallbacks, supportsEffort, type AiEffort } from "../config";
import { AiOutputError, type AiOutputErrorCode } from "../errors";
import { messageCostUsd, messageTokens } from "../pricing";
import type { LayoutAnswer, LayoutRequestBody } from "./api";
import { LAYOUT_SYSTEM_PROMPT, buildLayoutUserMessage, layoutTaskSpec } from "./prompt";
import { parseMapAnswer, parseProposalAnswer } from "./schema";

/** Cached prefix: identical for every request of both tasks, BYOK included. */
const SYSTEM: Anthropic.Beta.Messages.BetaTextBlockParam[] = [{ type: "text", text: LAYOUT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }];

export type LayoutModelOptions = { model: string; effort: AiEffort };
export type LayoutRequestOptions = { signal?: AbortSignal; timeout?: number; maxRetries?: number };

const messagesFor = (body: LayoutRequestBody): Anthropic.Beta.Messages.BetaMessageParam[] => [
  { role: "user", content: buildLayoutUserMessage(body) },
];

/** Input tokens (count_tokens is free), for the budget's worst case. */
export async function countLayoutTokens(
  client: Anthropic,
  body: LayoutRequestBody,
  options: Pick<LayoutModelOptions, "model">,
  requestOptions: LayoutRequestOptions = {},
): Promise<number> {
  const result = await client.beta.messages.countTokens(
    { model: options.model, system: SYSTEM, messages: messagesFor(body), output_config: { format: layoutTaskSpec(body.task).format } },
    requestOptions,
  );
  return result.input_tokens;
}

/** The model answered but not with a usable layout. `response` carries the billed cost. */
export class LayoutGenerationError extends AiOutputError {
  constructor(code: AiOutputErrorCode, message: string, response?: { model: string; costUsd: number }) {
    super(code, message, response);
    this.name = "LayoutGenerationError";
  }
}

export type LayoutGeneration = LayoutAnswer & {
  dropped: number;
  usage: { inputTokens: number; outputTokens: number; model: string };
  costUsd: number;
};

function parseJson(message: Anthropic.Beta.Messages.BetaMessage): unknown {
  const text = message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Validates a raw answer of `task` with the shared Zod schema (also used by «mi Claude»). */
export function parseLayoutAnswer(task: LayoutRequestBody["task"], raw: unknown) {
  if (task === "propose") {
    const parsed = parseProposalAnswer(raw);
    return parsed.ok ? { ok: true as const, value: { task, answer: parsed.answer } satisfies LayoutAnswer, dropped: parsed.dropped } : parsed;
  }
  const parsed = parseMapAnswer(raw);
  return parsed.ok ? { ok: true as const, value: { task, answer: parsed.answer } satisfies LayoutAnswer, dropped: parsed.dropped } : parsed;
}

/**
 * One structured-output call (thinking adaptive, bounded by `effort` and the task's `max_tokens`; `fallbacks:
 * "default"` only where the model supports it). `stop_reason` and `usage` are read before validating, so a refused,
 * cut or invalid answer still reports its real cost. Throws the SDK's typed errors and `LayoutGenerationError`.
 */
export async function generateLayout(
  client: Anthropic,
  body: LayoutRequestBody,
  options: LayoutModelOptions,
  requestOptions: LayoutRequestOptions = {},
): Promise<LayoutGeneration> {
  const spec = layoutTaskSpec(body.task);
  const fallbacks = supportsDefaultFallbacks(options.model);
  const message = await client.beta.messages.create(
    {
      model: options.model,
      max_tokens: spec.maxTokens,
      system: SYSTEM,
      messages: messagesFor(body),
      output_config: { format: spec.format, ...(supportsEffort(options.model) && { effort: options.effort }) },
      ...(fallbacks && { betas: [FALLBACK_BETA], fallbacks: "default" as const }),
    },
    requestOptions,
  );

  const costUsd = messageCostUsd(message, options.model);
  const billed = { model: message.model, costUsd };
  if (message.stop_reason === "refusal") throw new LayoutGenerationError("refused", "The model declined the request", billed);
  if (message.stop_reason === "max_tokens") throw new LayoutGenerationError("invalid-response", "The answer was cut (max_tokens)", billed);

  const raw = parseJson(message);
  if (raw === undefined) throw new LayoutGenerationError("invalid-response", `No JSON answer (stop_reason: ${message.stop_reason})`, billed);
  const parsed = parseLayoutAnswer(body.task, raw);
  if (!parsed.ok) {
    throw new LayoutGenerationError("invalid-response", `Unusable layout answer: ${parsed.problem}${parsed.detail ? ` (${parsed.detail})` : ""}`, billed);
  }
  return { ...parsed.value, dropped: parsed.dropped, usage: { ...messageTokens(message), model: message.model }, costUsd };
}
