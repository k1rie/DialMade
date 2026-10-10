// BYOK for the vision AI: the browser calls api.anthropic.com with the user's key, the same prompt,
// schema and validation as the hosted route. The key never reaches Dialmade. Loaded on demand.
import Anthropic from "@anthropic-ai/sdk";
import type { AiApiErrorCode } from "../api";
import { DEFAULT_AI_EFFORT, DEFAULT_AI_MODEL } from "../config";
import { AiOutputError } from "../errors";
import { roundUsd } from "../pricing";
import { generateFingerprint, type FingerprintGeneration } from "./generate";
import type { VisionPromptImage } from "./prompt";

export class ByokVisionError extends Error {
  constructor(
    readonly code: AiApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ByokVisionError";
  }
}

/** SDK and output errors → wire codes, from the most specific class to the base one. */
export function toByokVisionError(error: unknown): ByokVisionError {
  if (error instanceof Anthropic.APIUserAbortError) return new ByokVisionError("aborted", "Request aborted");
  if (error instanceof Anthropic.APIConnectionError) return new ByokVisionError("network", "Could not reach the Anthropic API");
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new ByokVisionError("invalid-key", "The API key was rejected");
  }
  if (error instanceof Anthropic.RateLimitError) return new ByokVisionError("rate-limited", "Rate limited");
  if (error instanceof Anthropic.InternalServerError) return new ByokVisionError("overloaded", "Anthropic API overloaded");
  if (error instanceof Anthropic.BadRequestError) return new ByokVisionError("upstream-error", "The Anthropic API rejected the request");
  if (error instanceof Anthropic.APIError) return new ByokVisionError("upstream-error", "Anthropic API error");
  if (error instanceof AiOutputError) return new ByokVisionError(error.code, error.message);
  return new ByokVisionError("upstream-error", "Unexpected error");
}

/** Rejects with `ByokVisionError`. */
export async function generateByokFingerprint(
  images: readonly VisionPromptImage[],
  options: { apiKey: string; model?: string; signal?: AbortSignal },
): Promise<FingerprintGeneration> {
  const client = new Anthropic({ apiKey: options.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 90_000 });
  try {
    const result = await generateFingerprint(
      client,
      images,
      { model: options.model ?? DEFAULT_AI_MODEL, effort: DEFAULT_AI_EFFORT },
      { ...(options.signal && { signal: options.signal }) },
    );
    return { ...result, costUsd: roundUsd(result.costUsd) };
  } catch (error) {
    throw toByokVisionError(error);
  }
}
