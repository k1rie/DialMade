// «Copiar prompt para mi Claude» for the copy AI (useAiCopy): the same system prompt, page JSON and
// validation (CopyEditsSchema + editsToPatches) as /api/ai/copy and BYOK. Client-safe, no SDK.
import type { Locale, OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { z } from "zod";
import { collectCopyFields, collectScreenCopyFields, missingScreens, type CopyField, type ScreenCopyTarget } from "./fields";
import { extractJsonAnswer, type ManualJob } from "./manual";
import { editsToPatches, type CopyPatchResult } from "./patches";
import { COPY_SYSTEM_PROMPT, CopyEditsSchema, buildCopyUserMessage } from "./prompt";

const COPY_JSON_SCHEMA = (() => {
  const json = z.toJSONSchema(CopyEditsSchema, { io: "output" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
})();

/** One page (`kind`) or several screens (`screens`, Modo Layout): the same targets as /api/ai/copy. */
export type CopyManualInput = {
  doc: DesignDoc;
  instructions?: string;
  locale?: Locale;
} & ({ kind: OutputKind; sectionIds?: readonly string[]; screens?: never } | { screens: readonly ScreenCopyTarget[]; kind?: never; sectionIds?: never });

/** `null` when those sections have no text to write (or a screen is missing). The patch is built against `doc` as it is now. */
export function copyManualJob(input: CopyManualInput): ManualJob<CopyPatchResult> | null {
  const { doc, instructions, locale } = input;
  const options = { ...(instructions && { instructions }), ...(locale && { locale }) };
  let fields: CopyField[];
  let user: string;
  if (input.screens) {
    if (missingScreens(doc, input.screens).length > 0) return null;
    fields = collectScreenCopyFields(doc, input.screens);
    if (fields.length === 0) return null;
    user = buildCopyUserMessage({ doc, screens: input.screens, fields, ...options });
  } else {
    const { kind, sectionIds } = input;
    fields = collectCopyFields(doc, kind, sectionIds ? { sectionIds } : {});
    if (fields.length === 0) return null;
    user = buildCopyUserMessage({ doc, kind, fields, ...options });
  }
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
