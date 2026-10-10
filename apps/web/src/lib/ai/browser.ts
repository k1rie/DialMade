// BYOK: the browser calls api.anthropic.com directly with the user's key. The key never reaches the
// Dialmade server and does not touch the hosted budget. Loaded on demand by useAiCopy.
import Anthropic from "@anthropic-ai/sdk";
import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import type { CopyApiErrorCode, CopyApiSuccess } from "./api";
import { DEFAULT_AI_EFFORT, DEFAULT_AI_MODEL } from "./config";
import { missingScreens, type ScreenCopyTarget } from "./fields";
import { CopyGenerationError, generateCopy, prepareCopyJob } from "./generate";
import { roundUsd } from "./pricing";

export class ByokCopyError extends Error {
  constructor(
    readonly code: CopyApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ByokCopyError";
  }
}

function toByokError(error: unknown): ByokCopyError {
  if (error instanceof Anthropic.APIUserAbortError) return new ByokCopyError("aborted", "Request aborted");
  if (error instanceof Anthropic.APIConnectionError) return new ByokCopyError("network", "Could not reach the Anthropic API");
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new ByokCopyError("invalid-key", "The API key was rejected");
  }
  if (error instanceof Anthropic.RateLimitError) return new ByokCopyError("rate-limited", "Rate limited");
  if (error instanceof Anthropic.InternalServerError) return new ByokCopyError("overloaded", "Anthropic API overloaded");
  if (error instanceof Anthropic.APIError) return new ByokCopyError("upstream-error", "Anthropic API error");
  if (error instanceof CopyGenerationError) return new ByokCopyError(error.code, error.message);
  return new ByokCopyError("upstream-error", "Unexpected error");
}

/** One page (`kind`) or several screens in one request (`screens`, Modo Layout), as /api/ai/copy takes them. */
export type ByokCopyInput = {
  doc: DesignDoc;
  instructions?: string;
} & ({ kind: OutputKind; sectionIds?: readonly string[]; screens?: never } | { screens: readonly ScreenCopyTarget[]; kind?: never; sectionIds?: never });

/** Same prompt, schema and validation as the hosted route. Rejects with `ByokCopyError`. */
export async function generateByokCopy(
  input: ByokCopyInput,
  options: { apiKey: string; model?: string; signal?: AbortSignal },
): Promise<CopyApiSuccess> {
  if (input.screens) {
    const missing = missingScreens(input.doc, input.screens);
    if (missing.length > 0) throw new ByokCopyError("no-page", `The document has no screen ${missing.join(", ")}`);
  } else if (!input.doc.pages[input.kind]) {
    throw new ByokCopyError("no-page", `The document has no ${input.kind} page`);
  }
  const job = prepareCopyJob(input);
  if (job.fields.length === 0) throw new ByokCopyError("no-fields", "There is no text to write in those sections");

  const client = new Anthropic({ apiKey: options.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 90_000 });
  try {
    const result = await generateCopy(
      client,
      input.doc,
      job,
      { model: options.model ?? DEFAULT_AI_MODEL, effort: DEFAULT_AI_EFFORT },
      { ...(options.signal && { signal: options.signal }) },
    );
    return {
      patches: result.patches,
      usage: result.usage,
      costUsd: roundUsd(result.costUsd),
      rejected: result.rejected,
      rejectedIds: result.rejectedIds,
      remainingBudgetUsd: null,
    };
  } catch (error) {
    throw toByokError(error);
  }
}
