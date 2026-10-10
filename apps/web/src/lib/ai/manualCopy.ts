// «Copiar prompt para mi Claude» for the copy AI (useAiCopy): the same system prompt, page JSON and
// validation (CopyEditsSchema + editsToPatches) as /api/ai/copy and BYOK. Client-safe, no SDK.
import type { Locale, OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { z } from "zod";
import { collectCopyFields } from "./fields";
import { extractJsonAnswer, type ManualJob } from "./manual";
import { editsToPatches, type CopyPatchResult } from "./patches";
import { COPY_SYSTEM_PROMPT, CopyEditsSchema, buildCopyUserMessage } from "./prompt";

const COPY_JSON_SCHEMA = (() => {
  const json = z.toJSONSchema(CopyEditsSchema, { io: "output" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
})();

export type CopyManualInput = {
  doc: DesignDoc;
  kind: OutputKind;
  sectionIds?: readonly string[];
  instructions?: string;
  locale?: Locale;
};

/** `null` when those sections have no text to write. The patch is built against `doc` as it is now. */
export function copyManualJob({ doc, kind, sectionIds, instructions, locale }: CopyManualInput): ManualJob<CopyPatchResult> | null {
  const fields = collectCopyFields(doc, kind, sectionIds ? { sectionIds } : {});
  if (fields.length === 0) return null;
  const user = buildCopyUserMessage({ doc, kind, fields, instructions, ...(locale && { locale }) });
  return {
    prompt: `${COPY_SYSTEM_PROMPT}

${user}

Answer with only one JSON object, without Markdown fences or comments, that matches this JSON Schema:
${JSON.stringify(COPY_JSON_SCHEMA)}`,
    attachments: [],
    parse(text) {
      const json = extractJsonAnswer(text);
      if (!json.ok) return json;
      const parsed = CopyEditsSchema.safeParse(json.value);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return { ok: false, error: "invalid-schema", ...(issue && { detail: `${issue.path.join(".") || "(root)"}: ${issue.message}` }) };
      }
      const result = editsToPatches(doc, fields, parsed.data.edits);
      if (result.patches.length === 0) return { ok: false, error: "no-result" };
      return { ok: true, value: result, dropped: result.rejected };
    },
  };
}
