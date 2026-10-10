import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Locale, OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import type { CopyApiErrorCode } from "./api";
import { FALLBACK_BETA, MAX_OUTPUT_TOKENS, supportsDefaultFallbacks, supportsEffort, type AiEffort } from "./config";
import { collectCopyFields, type CopyField } from "./fields";
import { editsToPatches, type CopyPatchResult } from "./patches";
import { messageCostUsd, messageTokens } from "./pricing";
import { COPY_SYSTEM_PROMPT, CopyEditsSchema, buildCopyUserMessage, type CopyEdits } from "./prompt";

/** Created once: the same schema object on every request. */
const copyOutputFormat = betaZodOutputFormat(CopyEditsSchema);

/** Cached prefix: the system prompt is identical for every request (and for BYOK). */
const SYSTEM: Anthropic.Beta.Messages.BetaTextBlockParam[] = [
  { type: "text", text: COPY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
];

export type CopyModelOptions = { model: string; effort: AiEffort; maxTokens?: number };

export type CopyJob = {
  fields: CopyField[];
  userMessage: string;
};

export type CopyJobInput = {
  doc: DesignDoc;
  kind: OutputKind;
  sectionIds?: readonly string[];
  instructions?: string;
  /** Language of the copy. Default: the page copy's own (`doc.brief.locale`). */
  locale?: Locale;
};

/** Fields of the page plus the user message for them (empty `fields` = nothing to write). */
export function prepareCopyJob({ doc, kind, sectionIds, instructions, locale }: CopyJobInput): CopyJob {
  const fields = collectCopyFields(doc, kind, sectionIds ? { sectionIds } : {});
  return {
    fields,
    userMessage: fields.length > 0 ? buildCopyUserMessage({ doc, kind, fields, instructions, ...(locale && { locale }) }) : "",
  };
}

const messagesFor = (job: CopyJob): Anthropic.Beta.Messages.BetaMessageParam[] => [{ role: "user", content: job.userMessage }];

export type CopyRequestOptions = { signal?: AbortSignal; timeout?: number; maxRetries?: number };

/** Input tokens of the request (free endpoint), for the budget's worst-case estimate. */
export async function countCopyTokens(
  client: Anthropic,
  job: CopyJob,
  options: CopyModelOptions,
  requestOptions: CopyRequestOptions = {},
): Promise<number> {
  const result = await client.beta.messages.countTokens(
    { model: options.model, system: SYSTEM, messages: messagesFor(job), output_config: { format: copyOutputFormat } },
    requestOptions,
  );
  return result.input_tokens;
}

/** The structured answer, validated with the same schema the request declared; `null` when it is not. */
function parseEdits(message: Anthropic.Beta.Messages.BetaMessage): CopyEdits | null {
  const text = message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
  try {
    const parsed = CopyEditsSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type CopyFailureCode = Extract<CopyApiErrorCode, "refused" | "invalid-response">;

/** The model answered but not with usable copy. `message` is set when the response (and its cost) is known. */
export class CopyGenerationError extends Error {
  constructor(
    readonly code: CopyFailureCode,
    message: string,
    readonly response?: { model: string; costUsd: number },
  ) {
    super(message);
    this.name = "CopyGenerationError";
  }
}

export type CopyGeneration = CopyPatchResult & {
  usage: { inputTokens: number; outputTokens: number; model: string };
  costUsd: number;
};

/**
 * One structured-output call with the shared prompt. Thinking stays adaptive (always on in Claude
 * Opus 5.5) and `effort` bounds it; `fallbacks: "default"` re-runs a classifier refusal on the model
 * Anthropic recommends for that category. The JSON is validated here, after reading `stop_reason`
 * and `usage`, so even a cut or invalid answer reports its real cost. Throws the SDK's typed errors
 * and `CopyGenerationError`.
 */
export async function generateCopy(
  client: Anthropic,
  doc: DesignDoc,
  job: CopyJob,
  options: CopyModelOptions,
  requestOptions: CopyRequestOptions = {},
): Promise<CopyGeneration> {
  const fallbacks = supportsDefaultFallbacks(options.model);
  const message = await client.beta.messages.create(
    {
      model: options.model,
      max_tokens: options.maxTokens ?? MAX_OUTPUT_TOKENS,
      system: SYSTEM,
      messages: messagesFor(job),
      output_config: {
        format: copyOutputFormat,
        ...(supportsEffort(options.model) && { effort: options.effort }),
      },
      ...(fallbacks && { betas: [FALLBACK_BETA], fallbacks: "default" as const }),
    },
    requestOptions,
  );

  const costUsd = messageCostUsd(message, options.model);
  if (message.stop_reason === "refusal") {
    throw new CopyGenerationError("refused", "The model declined the request", { model: message.model, costUsd });
  }
  const output = message.stop_reason === "max_tokens" ? null : parseEdits(message);
  if (!output) {
    throw new CopyGenerationError("invalid-response", `No structured output (stop_reason: ${message.stop_reason})`, {
      model: message.model,
      costUsd,
    });
  }

  const result = editsToPatches(doc, job.fields, output.edits);
  return { ...result, usage: { ...messageTokens(message), model: message.model }, costUsd };
}
