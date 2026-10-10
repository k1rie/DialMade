// «Copiar prompt para mi Claude» for the layout AI. Client-safe.
import { extractJsonAnswer, type ManualJob } from "../manual";
import type { LayoutAnswer, LayoutRequestBody } from "./api";
import { parseLayoutAnswer } from "./generate";
import { buildLayoutManualPrompt } from "./prompt";

/** «mi Claude» for `body` (the same request an API path would send); `parse` validates with the same Zod. */
export function layoutManualJob(body: LayoutRequestBody): ManualJob<LayoutAnswer> {
  return {
    prompt: buildLayoutManualPrompt(body),
    attachments: [],
    parse(text) {
      const json = extractJsonAnswer(text);
      if (!json.ok) return json;
      const parsed = parseLayoutAnswer(body.task, json.value);
      if (!parsed.ok) return { ok: false, error: parsed.problem, ...(parsed.detail && { detail: parsed.detail }) };
      return { ok: true, value: parsed.value, dropped: parsed.dropped };
    },
  };
}
