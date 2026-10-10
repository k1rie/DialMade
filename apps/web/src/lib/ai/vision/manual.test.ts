import { applyPatch } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { collectCopyFields } from "../fields";
import { COPY_SYSTEM_PROMPT } from "../prompt";
import { sampleDoc } from "../testing";
import { MAX_MANUAL_ANSWER_CHARS, extractJsonAnswer } from "../manual";
import { copyManualJob } from "../manualCopy";
import { visionManualJob } from "./manual";
import { VISION_SYSTEM_PROMPT } from "./prompt";
import { SWATCHES, sampleRef } from "./testing";

describe("extractJsonAnswer", () => {
  it("reads plain JSON, a fenced block and JSON with prose around it", () => {
    expect(extractJsonAnswer('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
    expect(extractJsonAnswer('```json\n{"a":1}\n```')).toEqual({ ok: true, value: { a: 1 } });
    expect(extractJsonAnswer('```\n{"a":1}\n```\n')).toEqual({ ok: true, value: { a: 1 } });
    expect(extractJsonAnswer('Here you go:\n{"a":{"b":2}}\nHope it helps')).toEqual({ ok: true, value: { a: { b: 2 } } });
  });

  it("says why it could not", () => {
    expect(extractJsonAnswer("   ")).toEqual({ ok: false, error: "empty" });
    expect(extractJsonAnswer("no json here")).toEqual({ ok: false, error: "not-json" });
    expect(extractJsonAnswer("{ broken")).toEqual({ ok: false, error: "not-json" });
    expect(extractJsonAnswer(`{"a":"${"x".repeat(MAX_MANUAL_ANSWER_CHARS)}"}`)).toEqual({ ok: false, error: "not-json" });
  });
});

describe("visionManualJob («mi Claude» for screenshots)", () => {
  const job = visionManualJob([
    { fileName: "app.png", swatches: SWATCHES },
    { swatches: SWATCHES.slice(0, 3) },
  ]);

  it("asks for the screenshots in order, with the same rules", () => {
    expect(job.attachments).toEqual(["app.png", "screenshot-2"]);
    expect(job.prompt.startsWith(VISION_SYSTEM_PROMPT)).toBe(true);
  });

  it("validates the pasted JSON with the same Zod and request checks as the API", () => {
    const ok = job.parse(JSON.stringify({ refs: [sampleRef(), sampleRef({ refIndex: 1, colorRoles: [{ swatchIndex: 5, role: "primary" }] })] }));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.fingerprints[0]).toMatchObject({ recipeId: "soft-ui" });
      expect(ok.value.fingerprints[1]?.colorRoles).toEqual([]);
      expect(ok.dropped).toBe(1);
    }
    expect(job.parse("")).toEqual({ ok: false, error: "empty" });
    expect(job.parse("sure!")).toEqual({ ok: false, error: "not-json" });
    expect(job.parse('{"refs":[]}')).toEqual({ ok: false, error: "no-result" });
    expect(job.parse(JSON.stringify({ refs: [{ ...sampleRef(), mode: "sepia" }] }))).toMatchObject({ ok: false, error: "invalid-schema", detail: expect.stringContaining("refs.0.mode") });
  });
});

describe("copyManualJob («mi Claude» for copy)", () => {
  const doc = sampleDoc(["landing"]);
  const fields = collectCopyFields(doc, "landing", { sectionIds: ["hero-1"] });
  const title = fields.find((field) => field.path.join(".") === "title")!;

  it("is the copy system prompt, the page JSON and the schema", () => {
    const job = copyManualJob({ doc, kind: "landing", sectionIds: ["hero-1"], instructions: "más directo" })!;
    expect(job.prompt.startsWith(COPY_SYSTEM_PROMPT)).toBe(true);
    expect(job.prompt).toContain("<page_copy>");
    expect(job.prompt).toContain("más directo");
    expect(job.prompt).toContain('"edits"');
    expect(job.attachments).toEqual([]);
  });

  it("turns a valid answer into patches that apply to the doc, and rejects the rest", () => {
    const job = copyManualJob({ doc, kind: "landing", sectionIds: ["hero-1"] })!;
    const parsed = job.parse(JSON.stringify({ edits: [{ id: title.id, text: "Cobra en segundos" }, { id: "f999", text: "x" }] }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.dropped).toBe(1);
    expect(applyPatch(doc, parsed.value.patches).ok).toBe(true);
    expect(job.parse('{"edits":[{"id":"f999","text":"x"}]}')).toEqual({ ok: false, error: "no-result" });
    expect(job.parse('{"edits":"nope"}')).toMatchObject({ ok: false, error: "invalid-schema" });
  });

  it("is null when there is nothing to write", () => {
    expect(copyManualJob({ doc: sampleDoc(["brand"]), kind: "landing" })).toBeNull();
  });
});
