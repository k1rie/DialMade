import { applyPatch, type Screen } from "@dialmade/doc";
import { DEFAULT_SCOPE, absorbChildren, deriveResponsive, inferStructure, toCss, type LayoutBlock, type LayoutDoc } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { sampleScreensDoc } from "@/lib/ai/testing";
import { CONTENT_CACHE_SIZE, SCREEN_ATTRIBUTE, compileScreenLayout, scopedScreenCss, screenScope } from "./screen-layout";

/** Selectors of every rule (at-rules such as `@container` are not selectors). */
function selectors(css: string): string[] {
  return css
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith("{") && !line.startsWith("@"))
    .flatMap((line) => line.slice(0, -1).split(","))
    .map((selector) => selector.trim())
    .filter(Boolean);
}

describe("scopedScreenCss", () => {
  const doc = sampleScreensDoc();

  it("is the export's CSS with the layout scope of the screen: same rules, same order, same specificity", () => {
    for (const id of doc.screenOrder) {
      const screen = doc.screens[id]!;
      const exported = compileScreenLayout(screen).css;
      const scoped = scopedScreenCss(screen);
      expect(exported.startsWith(`${DEFAULT_SCOPE} {`)).toBe(true);
      expect(scoped).toBe(exported.replaceAll(DEFAULT_SCOPE, screenScope(id)));
      // The screen attribute sits inside `:where()`, so it adds no specificity.
      expect(screenScope(id)).toBe(`:where([${SCREEN_ATTRIBUTE}="${id}"]) ${DEFAULT_SCOPE}`);
    }
  });

  it("matches only inside its own screen, so several screens can render at once", () => {
    const [a, b] = doc.screenOrder as [string, string];
    const cssA = scopedScreenCss(doc.screens[a]!);
    const cssB = scopedScreenCss(doc.screens[b]!);
    const listA = selectors(cssA);
    expect(listA.length).toBeGreaterThan(1);
    for (const selector of listA) expect(selector.startsWith(screenScope(a))).toBe(true);
    for (const selector of selectors(cssB)) expect(selector.startsWith(screenScope(b))).toBe(true);
    expect(cssA).not.toContain(`"${b}"`);
  });

  it("is deterministic and leaves the export's compile untouched", () => {
    const screen = doc.screens[doc.screenOrder[0]!]!;
    const before = compileScreenLayout(screen).css;
    const copy = structuredClone(screen);
    expect(scopedScreenCss(copy)).toBe(scopedScreenCss(screen));
    expect(compileScreenLayout(screen).css).toBe(before);
  });

  it("escapes a quote or a backslash in the id (screen ids never have them; the selector stays valid anyway)", () => {
    expect(screenScope('a"b\\c')).toBe(`:where([${SCREEN_ATTRIBUTE}="a\\"b\\\\c"]) ${DEFAULT_SCOPE}`);
  });
});

describe("compileScreenLayout cache", () => {
  /** The compile without any cache: what every hit must equal. */
  const fresh = (screen: Pick<Screen, "layout" | "kind">) => {
    const absorb = absorbChildren(screen.layout);
    const structure = inferStructure(absorb.layout);
    const responsive = deriveResponsive(absorb.layout, structure);
    return toCss(absorb.layout, { kind: screen.kind, structure, responsive });
  };
  const withBlock = (layout: LayoutDoc, id: string, change: (block: LayoutBlock) => LayoutBlock): LayoutDoc => ({
    ...layout,
    blocks: { ...layout.blocks, [id]: change(layout.blocks[id]!) },
  });

  it("a patch that touches no layout reuses every screen's compile and scoped CSS (new but equal layout objects)", () => {
    const doc = sampleScreensDoc();
    const before = doc.screenOrder.map((id) => ({ compiled: compileScreenLayout(doc.screens[id]!), scoped: scopedScreenCss(doc.screens[id]!) }));
    const result = applyPatch(doc, [{ op: "replace", path: "/brand/name", value: "Otra marca" }]);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    doc.screenOrder.forEach((id, index) => {
      const screen = result.doc.screens[id]!;
      expect(compileScreenLayout(screen)).toBe(before[index]!.compiled);
      expect(scopedScreenCss(screen)).toBe(before[index]!.scoped);
    });
    // A deep copy is the same content: the same result.
    const first = doc.screens[doc.screenOrder[0]!]!;
    expect(compileScreenLayout(structuredClone(first))).toBe(before[0]!.compiled);
  });

  it("any change in the layout compiles again, exactly as an uncached compile would", () => {
    const doc = sampleScreensDoc();
    const screen = doc.screens[doc.screenOrder[0]!]!;
    const base = compileScreenLayout(screen);
    const [id] = Object.keys(screen.layout.blocks) as [string];
    const moved = { ...screen, layout: withBlock(screen.layout, id, (block) => ({ ...block, rect: { ...block.rect, h: block.rect.h + 3 } })) };
    const compiled = compileScreenLayout(moved);
    expect(compiled).not.toBe(base);
    expect(compiled.css).toBe(fresh(moved));
    expect(compiled.css).not.toBe(base.css);
    // Back to the original content: the first result again.
    expect(compileScreenLayout(structuredClone(screen))).toBe(base);
  });

  it("keeps apart what JSON would merge (an `undefined` prop, -0) and each kind", () => {
    const doc = sampleScreensDoc();
    const screen = doc.screens[doc.screenOrder[0]!]!;
    const [id] = Object.keys(screen.layout.blocks) as [string];
    const base = compileScreenLayout(screen);
    const undefinedNote = { ...screen, layout: withBlock(screen.layout, id, (block) => ({ ...block, note: undefined })) };
    expect(compileScreenLayout(undefinedNote)).not.toBe(base);
    const minusZero = { ...screen, layout: withBlock(screen.layout, id, (block) => ({ ...block, z: -0 })) };
    const zero = { ...screen, layout: withBlock(screen.layout, id, (block) => ({ ...block, z: 0 })) };
    expect(compileScreenLayout(minusZero)).not.toBe(compileScreenLayout(zero));
    const otherKind = { ...screen, kind: screen.kind === "app" ? ("landing" as const) : ("app" as const) };
    const compiledOther = compileScreenLayout(otherKind);
    expect(compiledOther).not.toBe(base);
    expect(compiledOther.css).toBe(fresh(otherKind));
    expect(compileScreenLayout(screen)).toBe(base);
  });

  it("is bounded: the least recently used content is dropped, a recently used one stays", () => {
    const doc = sampleScreensDoc();
    const screen = doc.screens[doc.screenOrder[0]!]!;
    const [id] = Object.keys(screen.layout.blocks) as [string];
    const version = (n: number) => ({ ...screen, layout: withBlock(screen.layout, id, (block) => ({ ...block, label: `v${n}` })) });
    const oldest = compileScreenLayout(version(0));
    const kept = compileScreenLayout(version(1));
    for (let n = 2; n <= CONTENT_CACHE_SIZE; n++) {
      compileScreenLayout(version(n));
      // Used on every step: never the least recent one.
      expect(compileScreenLayout(version(1))).toBe(kept);
    }
    expect(compileScreenLayout(version(1))).toBe(kept);
    const recompiled = compileScreenLayout(version(0));
    expect(recompiled).not.toBe(oldest);
    expect(recompiled.css).toBe(oldest.css);
  });
});
