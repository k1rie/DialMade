// BYOK for the layout AI: the browser calls api.anthropic.com with the user's key, the same prompt, schema and
// validation as the hosted route. The key never reaches Dialmade. Loaded on demand.
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_AI_EFFORT, DEFAULT_AI_MODEL } from "../config";
import { roundUsd } from "../pricing";
import { toByokVisionError } from "../vision/browser";
import type { LayoutRequestBody } from "./api";
import { generateLayout, type LayoutGeneration } from "./generate";

export { ByokVisionError as ByokLayoutError } from "../vision/browser";

/** Rejects with `ByokLayoutError` (the SDK's and the output's errors as wire codes). */
export async function generateByokLayout(
  body: LayoutRequestBody,
  options: { apiKey: string; model?: string; signal?: AbortSignal },
): Promise<LayoutGeneration> {
  const client = new Anthropic({ apiKey: options.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 90_000 });
  try {
    const result = await generateLayout(
      client,
      body,
      { model: options.model ?? DEFAULT_AI_MODEL, effort: DEFAULT_AI_EFFORT },
      { ...(options.signal && { signal: options.signal }) },
    );
    return { ...result, costUsd: roundUsd(result.costUsd) };
  } catch (error) {
    throw toByokVisionError(error);
  }
}
