// Server only: POST /api/ai/layout under the free-tier policy of ../access. Never import it from client code.
import { runWithAiBudget, type AiBudgetDeps, type AiCaller, type AiHostedResult } from "../access";
import { supportsDefaultFallbacks } from "../config";
import { maxRequestCostUsd } from "../pricing";
import type { LayoutApiSuccess, LayoutRequestBody } from "./api";
import { countLayoutTokens, generateLayout } from "./generate";
import { layoutTaskSpec } from "./prompt";

export type HostedLayoutData = Pick<LayoutApiSuccess, "task" | "answer" | "usage" | "dropped">;

export type HostedLayoutContext = AiBudgetDeps & { caller: AiCaller | null };

/**
 * ONE structured-output call under the free tier, whatever the task: 2–3 variants of «Describe tu producto», or
 * the types of up to 24 free blocks, are one free use. The device's free uses, the IP's daily limit and the global
 * budget are checked and the worst case (count_tokens + the task's max_tokens at list price) reserved atomically
 * before calling, then settled with the real usage. The model is the free tier's (DIALMADE_AI_FREE_MODEL).
 */
export async function generateHostedLayout(body: LayoutRequestBody, context: HostedLayoutContext): Promise<AiHostedResult<HostedLayoutData>> {
  const { maxTokens } = layoutTaskSpec(body.task);
  return runWithAiBudget<HostedLayoutData>(
    context.caller,
    {
      estimate: async ({ client, model, requestOptions }) => {
        const inputTokens = await countLayoutTokens(client, body, { model }, requestOptions);
        return maxRequestCostUsd({ model, inputTokens, maxOutputTokens: maxTokens, fallbacks: supportsDefaultFallbacks(model) });
      },
      run: async ({ client, model, effort, requestOptions }) => {
        const result = await generateLayout(client, body, { model, effort }, requestOptions);
        const data = (
          result.task === "propose"
            ? { task: "propose", answer: result.answer, usage: result.usage, dropped: result.dropped }
            : { task: "map", answer: result.answer, usage: result.usage, dropped: result.dropped }
        ) satisfies HostedLayoutData;
        return { data, costUsd: result.costUsd };
      },
    },
    context,
  );
}
