// «Copiar prompt para mi Claude»: the free way out when there are no free uses and no key, shared by
// the copy AI (manualCopy) and the vision AI (vision/manual). The user copies the prompt (rules +
// data + JSON Schema) into Claude with their own subscription and pastes the JSON back; it is
// validated with the same Zod schema as the API paths. Client-safe.

export type ManualParseError = "empty" | "not-json" | "invalid-schema" | "no-result";

export type ManualParseResult<T> = { ok: true; value: T; dropped: number } | { ok: false; error: ManualParseError; detail?: string };

export type ManualJob<T> = {
  /** The whole text to paste into Claude. */
  prompt: string;
  /** Files the user attaches in Claude, in this order (the screenshots); empty for copy. */
  attachments: readonly string[];
  /** What Claude answers: JSON (copy, vision, layout; the default) or HTML roots («Diseño con IA»). Words the steps. */
  format?: "json" | "html";
  /** Validates the pasted answer. Never throws. */
  parse: (text: string) => ManualParseResult<T>;
};

/** Longer than any valid answer: 4 screenshots × 12 roles is a few KB, a page of copy ~20 KB. */
export const MAX_MANUAL_ANSWER_CHARS = 200_000;

/** The JSON object in a pasted answer: as is, inside ``` fences, or between the first «{» and the last «}». */
export function extractJsonAnswer(text: string): { ok: true; value: unknown } | { ok: false; error: "empty" | "not-json" } {
  let body = text.trim();
  if (body === "") return { ok: false, error: "empty" };
  if (body.length > MAX_MANUAL_ANSWER_CHARS) return { ok: false, error: "not-json" };
  if (body.startsWith("```")) {
    const newline = body.indexOf("\n");
    body = newline < 0 ? "" : body.slice(newline + 1);
    if (body.trimEnd().endsWith("```")) body = body.trimEnd().slice(0, -3);
  }
  const attempts = [body];
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start >= 0 && end > start && (start > 0 || end < body.length - 1)) attempts.push(body.slice(start, end + 1));
  for (const attempt of attempts) {
    try {
      return { ok: true, value: JSON.parse(attempt) };
    } catch {
      // next attempt
    }
  }
  return { ok: false, error: "not-json" };
}
