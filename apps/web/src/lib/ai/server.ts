// Server only: POST /api/ai/copy under the free-tier policy of ./access. Never import it from client components.
import { safeParseDesignDoc } from "@dialmade/doc";
import { aiFailure, runWithAiBudget, type AiBudgetDeps, type AiCaller, type AiHostedResult } from "./access";
import { isScreensCopyBody, type CopyApiSuccess, type CopyRequestBody } from "./api";
import { MAX_OUTPUT_TOKENS, supportsDefaultFallbacks } from "./config";
import { missingScreens } from "./fields";
import { countCopyTokens, generateCopy, prepareCopyJob, type CopyJob } from "./generate";
import { maxRequestCostUsd } from "./pricing";

export { aiStatus, aiStatusResponse, resolveAiCaller, typicalRequestCostUsd } from "./access";
export { clientIp, readAiServerConfig, type AiServerConfig } from "./serverConfig";

export type HostedCopyData = Pick<CopyApiSuccess, "patches" | "usage" | "rejected" | "rejectedIds">;

export type HostedCopyContext = AiBudgetDeps & { caller: AiCaller | null };

/**
 * Validates the document (v1 is migrated to v2) and the fields locally, then ONE structured-output call under
 * the free tier, whatever the number of screens (critique #7: one «Generar» = one free use): the device's free
 * uses, the IP's daily limit and the global budget are checked and the worst case (count_tokens + max_tokens
 * at list price) reserved atomically before calling, then settled with the real usage. The model is the free
 * tier's (DIALMADE_AI_FREE_MODEL, or DIALMADE_AI_MODEL).
 */
export async function generateHostedCopy(body: CopyRequestBody, context: HostedCopyContext): Promise<AiHostedResult<HostedCopyData>> {
  const parsed = safeParseDesignDoc(body.doc);
  if (!parsed.success) return aiFailure(400, "invalid-request", "The document is not a valid DesignDoc");
  const doc = parsed.data;
  const options = { locale: body.locale, ...(body.instructions && { instructions: body.instructions }) };

  let job: CopyJob;
  if (isScreensCopyBody(body)) {
    const missing = missingScreens(doc, body.screens);
    if (missing.length > 0) return aiFailure(400, "no-page", `The document has no screen ${missing.join(", ")}`);
    job = prepareCopyJob({ doc, screens: body.screens, ...options });
  } else {
    if (!doc.pages[body.kind]) return aiFailure(400, "no-page", `The document has no ${body.kind} page`);
    job = prepareCopyJob({ doc, kind: body.kind, ...(body.sectionIds && { sectionIds: body.sectionIds }), ...options });
  }
  if (job.fields.length === 0) return aiFailure(422, "no-fields", "There is no text to write in those sections");

  return runWithAiBudget<HostedCopyData>(
    context.caller,
    {
      estimate: async ({ client, model, effort, requestOptions }) => {
        const inputTokens = await countCopyTokens(client, job, { model, effort }, requestOptions);
        return maxRequestCostUsd({ model, inputTokens, maxOutputTokens: MAX_OUTPUT_TOKENS, fallbacks: supportsDefaultFallbacks(model) });
      },
      run: async ({ client, model, effort, requestOptions }) => {
        const result = await generateCopy(client, doc, job, { model, effort }, requestOptions);
        return {
          data: { patches: result.patches, usage: result.usage, rejected: result.rejected, rejectedIds: result.rejectedIds },
          costUsd: result.costUsd,
        };
      },
    },
    context,
  );
}
