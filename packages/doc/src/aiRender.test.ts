import { describe, expect, it } from "vitest";
import { MAX_AI_BLOCK_BYTES, MAX_AI_RENDER_BYTES, MAX_AI_STASHED_BLOCKS, aiRenderBytes, type AiBlock, type AiDirection } from "./aiRender";
import { safeParseDesignDoc } from "./doc";
import { applyPatch } from "./patch";
import { screensDoc } from "./testing/fixtures";

const provenance = { kind: "generate", path: "free", model: "claude-haiku-5-5", createdAt: "2026-10-10T12:00:00.000Z", costUsd: 0.004, inputTokens: 5000, outputTokens: 7000, promptVersion: "ai-render/1", directionId: "dir-1", seed: 7 } as const;
const block = (html = '<section class="@container" data-block-id="b-hero"><h1 data-dl-t="0">Hola</h1></section>'): AiBlock => ({
  html,
  active: true,
  basis: "abc123",
  gates: { contrast: "fixed", responsive: "ok", dropped: 2, warnings: [{ code: "contrast-fixed", detail: "1" }] },
  provenance,
});
const direction: AiDirection = {
  id: "dir-1",
  version: 1,
  seed: 7,
  chip: "auto",
  axes: { composition: "editorial", typeVoice: "humanist", decoration: "tinted-panels", imagery: "framed-screens", colorStrategy: "tonal-monochrome", rhythm: "airy" },
  moves: ["Cards with a border and no shadow"],
  rationale: "Why.",
  provenance: { ...provenance, kind: "direction" },
};

describe("«Diseño con IA» storage (additive, versioned, with provenance)", () => {
  it("a document without AI blocks is unchanged (still v2)", () => {
    const doc = screensDoc();
    expect(doc.version).toBe(2);
    expect(doc.aiRender).toBeUndefined();
    expect(doc.screens["s-home"]!.aiRender).toBeUndefined();
  });

  it("stores the direction and the AI blocks of a screen through patches", () => {
    const doc = screensDoc();
    const result = applyPatch(doc, [
      { op: "add", path: "/aiRender", value: { version: 1, direction } },
      { op: "add", path: "/screens/s-home/aiRender", value: { version: 1, blocks: { "b-hero": block() } } },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.aiRender?.direction?.axes.composition).toBe("editorial");
    expect(result.doc.screens["s-home"]!.aiRender!.blocks["b-hero"]!.provenance.model).toBe("claude-haiku-5-5");
    // Round trip through storage.
    expect(safeParseDesignDoc(JSON.parse(JSON.stringify(result.doc))).success).toBe(true);
  });

  it("rejects unknown members, unknown axes and bad provenance", () => {
    const doc = screensDoc();
    const bad = (value: unknown, path = "/screens/s-home/aiRender") => applyPatch(doc, [{ op: "add", path, value }]).ok;
    expect(bad({ version: 1, blocks: { "b-hero": { ...block(), extra: 1 } } })).toBe(false);
    expect(bad({ version: 2, blocks: {} })).toBe(false);
    expect(bad({ version: 1, blocks: { "b-hero": { ...block(), provenance: { ...provenance, path: "server" } } } })).toBe(false);
    expect(bad({ version: 1, direction: { ...direction, axes: { ...direction.axes, composition: "chaos" } } }, "/aiRender")).toBe(false);
    expect(bad({ version: 1, blocks: { "b-hero": { ...block(), provenance: { ...provenance, request: "x".repeat(501) } } } })).toBe(false);
  });

  it("caps a block at 16 KB and the document's AI blocks at 1 MB", () => {
    const doc = screensDoc();
    const big = block(`<section data-block-id="b-hero">${"x".repeat(MAX_AI_BLOCK_BYTES)}</section>`);
    expect(applyPatch(doc, [{ op: "add", path: "/screens/s-home/aiRender", value: { version: 1, blocks: { "b-hero": big } } }]).ok).toBe(false);
    const html = `<section data-block-id="b">${"x".repeat(15_000)}</section>`;
    const blocks = Object.fromEntries(Array.from({ length: Math.ceil(MAX_AI_RENDER_BYTES / 15_000) + 1 }, (_, i) => [`b-${i}`, block(html)]));
    const result = safeParseDesignDoc({ ...doc, screens: { ...doc.screens, "s-home": { ...doc.screens["s-home"]!, aiRender: { version: 1, blocks } } } });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues[0]!.path).toEqual(["aiRender"]);
  });

  it("keeps the recipe a block was designed with, and the AI blocks of removed layout blocks (the stash)", () => {
    const doc = screensDoc();
    const designed = { ...block(), provenance: { ...provenance, recipeId: "soft-ui" } };
    const result = applyPatch(doc, [{ op: "add", path: "/screens/s-home/aiRender", value: { version: 1, blocks: { "b-hero": designed }, stash: { "b-old": block() } } }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.screens["s-home"]!.aiRender!.blocks["b-hero"]!.provenance.recipeId).toBe("soft-ui");
    expect(Object.keys(result.doc.screens["s-home"]!.aiRender!.stash!)).toEqual(["b-old"]);
    const tooMany = Object.fromEntries(Array.from({ length: MAX_AI_STASHED_BLOCKS + 1 }, (_, i) => [`b-${i}`, block()]));
    expect(applyPatch(doc, [{ op: "add", path: "/screens/s-home/aiRender", value: { version: 1, blocks: {}, stash: tooMany } }]).ok).toBe(false);
  });

  it("counts the AI blocks of stashed screens toward the 1 MB cap", () => {
    const render = { version: 1, blocks: { "b-hero": block() } };
    const one = aiRenderBytes({ screens: { a: { aiRender: render } } });
    expect(aiRenderBytes({ screens: { a: { aiRender: render } }, screenStash: { b: { aiRender: render } } })).toBe(2 * one);
  });

  it("a block edit is one immutable update: the other blocks and screens keep their identity (cheap undo history)", () => {
    const doc = screensDoc();
    const seeded = applyPatch(doc, [{ op: "add", path: "/screens/s-home/aiRender", value: { version: 1, blocks: { "b-hero": block(), "b-other": block() } } }]);
    expect(seeded.ok).toBe(true);
    if (!seeded.ok) return;
    const before = seeded.doc;
    const edited = applyPatch(before, [{ op: "replace", path: "/screens/s-home/aiRender/blocks/b-hero/html", value: '<section class="@container" data-block-id="b-hero"><h1 data-dl-t="0">Adiós</h1></section>' }]);
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    const after = edited.doc;
    expect(after.screens["s-home"]!.aiRender!.blocks["b-hero"]!.html).toContain("Adiós");
    expect(before.screens["s-home"]!.aiRender!.blocks["b-hero"]!.html).toContain("Hola");
    expect(after.screens["s-home"]!.aiRender!.blocks["b-other"]).toBe(before.screens["s-home"]!.aiRender!.blocks["b-other"]);
    expect(after.screens["s-dashboard"]).toBe(before.screens["s-dashboard"]);
    expect(after.brand).toBe(before.brand);
  });
});
