// The vision call, shared by the hosted route (./server) and BYOK (./browser). Imports the SDK: load it
// on the server or on demand in the browser.
import type Anthropic from "@anthropic-ai/sdk";
import { FALLBACK_BETA, supportsDefaultFallbacks, supportsEffort, type AiEffort } from "../config";
import { AiOutputError, type AiOutputErrorCode } from "../errors";
import { messageCostUsd, messageTokens } from "../pricing";
import { VISION_MAX_OUTPUT_TOKENS } from "./constants";
import { VISION_SYSTEM_PROMPT, buildVisionContent, type VisionPromptImage } from "./prompt";
import { normalizeFingerprintAnswer, styleFingerprintFormat, type NormalizedFingerprint } from "./schema";

/** Cached prefix: identical for every request, BYOK included. */
const SYSTEM: Anthropic.Beta.Messages.BetaTextBlockParam[] = [{ type: "text", text: VISION_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }];

export type VisionModelOptions = { model: string; effort: AiEffort; maxTokens?: number };
export type VisionRequestOptions = { signal?: AbortSignal; timeout?: number; maxRetries?: number };

const messagesFor = (images: readonly VisionPromptImage[]): Anthropic.Beta.Messages.BetaMessageParam[] => [
  { role: "user", content: buildVisionContent(images) },
];

/** Input tokens, images included (count_tokens is free), for the budget's worst case. */
export async function countVisionTokens(
  client: Anthropic,
  images: readonly VisionPromptImage[],
  options: Pick<VisionModelOptions, "model">,
  requestOptions: VisionRequestOptions = {},
): Promise<number> {
  const result = await client.beta.messages.countTokens(
    { model: options.model, system: SYSTEM, messages: messagesFor(images), output_config: { format: styleFingerprintFormat } },
    requestOptions,
  );
  return result.input_tokens;
}

/** The model answered but not with a usable fingerprint. `response` carries the billed cost. */
export class FingerprintGenerationError extends AiOutputError {
  constructor(code: AiOutputErrorCode, message: string, response?: { model: string; costUsd: number }) {
    super(code, message, response);
    this.name = "FingerprintGenerationError";
  }
}

export type FingerprintGeneration = NormalizedFingerprint & {
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

/**
 * One structured-output call. Thinking is left adaptive (it cannot be turned off on Claude Opus 5.5)
 * and `effort` bounds it. `fallbacks: "default"` only where the model supports it (not Claude Haiku
 * 5.5). `stop_reason` and `usage` are read before validating, so a refused, cut or invalid answer
 * still reports its real cost. Throws the SDK's typed errors and `FingerprintGenerationError`.
 */
export async function generateFingerprint(
  client: Anthropic,
  images: readonly VisionPromptImage[],
  options: VisionModelOptions,
  requestOptions: VisionRequestOptions = {},
): Promise<FingerprintGeneration> {
  const fallbacks = supportsDefaultFallbacks(options.model);
  const message = await client.beta.messages.create(
    {
      model: options.model,
      max_tokens: options.maxTokens ?? VISION_MAX_OUTPUT_TOKENS,
      system: SYSTEM,
      messages: messagesFor(images),
      output_config: {
        format: styleFingerprintFormat,
        ...(supportsEffort(options.model) && { effort: options.effort }),
      },
      ...(fallbacks && { betas: [FALLBACK_BETA], fallbacks: "default" as const }),
    },
    requestOptions,
  );

  const costUsd = messageCostUsd(message, options.model);
  const billed = { model: message.model, costUsd };
  if (message.stop_reason === "refusal") throw new FingerprintGenerationError("refused", "The model declined the request", billed);
  if (message.stop_reason === "max_tokens") throw new FingerprintGenerationError("invalid-response", "The answer was cut (max_tokens)", billed);

  const raw = parseJson(message);
  if (raw === undefined) throw new FingerprintGenerationError("invalid-response", `No JSON answer (stop_reason: ${message.stop_reason})`, billed);
  const normalized = normalizeFingerprintAnswer(
    raw,
    images.map((image) => image.swatches.length),
  );
  if (!normalized.ok) {
    throw new FingerprintGenerationError("invalid-response", `Unusable fingerprint: ${normalized.problem}${normalized.detail ? ` (${normalized.detail})` : ""}`, billed);
  }
  return {
    answer: normalized.answer,
    fingerprints: normalized.fingerprints,
    dropped: normalized.dropped,
    usage: { ...messageTokens(message), model: message.model },
    costUsd,
  };
}
