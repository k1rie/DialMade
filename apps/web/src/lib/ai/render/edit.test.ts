import { MAX_AI_RENDER_BYTES, MAX_AI_STASHED_BLOCKS, aiRenderBytes, applyPatch, type AiBlock, type DesignDoc } from "@dialmade/doc";
import type { LayoutBlock } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { withContentLocale, withGeneratedScreens, type GeneratedScreenInput } from "@/lib/design-engine";
import {
  aiBlockOf,
  blockTextAt,
  carryAiRenderOps,
  isAiBlockStale,
  isAiBlockStyleChanged,
  remapAiBlock,
  replaceBlockText,
  setAiBlockActiveOps,
  setAiBlockOps,
  staleAiBlocks,
  styleChangedAiBlocks,
  textEditOps,
  withCarriedAiRender,
} from "./edit";
import { aiHtml as html, blockOfType as blockOf, designedDoc, draftScreen, freshDoc as fresh, idFactory, testAiBlock as aiBlock, unwrap as ok } from "./editFixtures";

const patched = (doc: DesignDoc, ops: unknown[]) => ok(applyPatch(doc, ops));
const designed = () => designedDoc();

const without = (screen: GeneratedScreenInput, id: string): GeneratedScreenInput => {
  const blocks = { ...screen.layout.blocks };
  delete blocks[id];
  return { ...screen, layout: { ...screen.layout, blocks } };
};

describe("inline text of an AI block", () => {
  it("replaces the element's own text and keeps its styled children when their text is still there", () => {
    const out = replaceBlockText(html("b"), 0, "Agenda tu corte en dos toques")!;
    expect(out).toContain('<h1 class="text-h1" data-dl-t="0">Agenda tu corte <span class="text-primary-text" data-dl-t="1">en dos toques</span></h1>');
    expect(blockTextAt(out, 0)).toBe("Agenda tu corte en dos toques");
  });

  it("flattens to plain text when the styled part was rewritten too, keeping icons", () => {
    expect(replaceBlockText(html("b"), 0, "Todo nuevo")).toContain('<h1 class="text-h1" data-dl-t="0">Todo nuevo</h1>');
    expect(replaceBlockText(html("b"), 3, "Gratis 14 días")).toContain('<p id="ai-b-hint" data-dl-t="3"><i data-icon="check" aria-hidden="true"></i>Gratis 14 días</p>');
  });

  it("escapes what the user typed: text never becomes HTML", () => {
    const out = replaceBlockText(html("b"), 2, '<img src=x onerror="alert(1)"> & <script>')!;
    expect(out).toContain("&lt;img src=x onerror=\"alert(1)\"&gt; &amp; &lt;script&gt;");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("<script");
  });

  it("is ONE replace of the block's HTML (one undo step); unknown text or no AI block → null; same text → no op", () => {
    const { doc, hero } = designed();
    const ops = textEditOps(doc, "s-home", hero, 2, "Correo")!;
    expect(ops).toEqual([{ op: "replace", path: `/screens/s-home/aiRender/blocks/${hero}/html`, value: expect.stringContaining(">Correo</label>") }]);
    expect(applyPatch(doc, ops).ok).toBe(true);
    expect(textEditOps(doc, "s-home", hero, 99, "x")).toBeNull();
    expect(textEditOps(doc, "s-home", "b-nope", 0, "x")).toBeNull();
    expect(textEditOps(doc, "s-home", hero, 2, "Email")).toEqual([]);
  });

  it("refuses an edit that would pass the 16 KB cap of a block", () => {
    const big = `<section class="@container" data-block-id="b"><p data-dl-t="0">x</p>${'<p class="p-4 text-body text-foreground">' + "y".repeat(100) + "</p>".repeat(1)}</section>`;
    expect(replaceBlockText(big, 0, "z".repeat(1990))).not.toBeNull();
    const near = `<section class="@container" data-block-id="b"><p data-dl-t="0">x</p><p>${"y".repeat(16 * 1024 - 120)}</p></section>`;
    expect(replaceBlockText(near, 0, "z".repeat(1990))).toBeNull();
  });
});

describe("«Usar diseño base» / «Usar IA otra vez»", () => {
  it("only flips `active`, keeping the HTML", () => {
    const { doc, hero } = designed();
    const base = patched(doc, setAiBlockActiveOps(doc, "s-home", hero, false));
    expect(aiBlockOf(base, "s-home", hero)).toMatchObject({ active: false, html: html(hero) });
    expect(setAiBlockActiveOps(base, "s-home", hero, false)).toEqual([]);
    const again = patched(base, setAiBlockActiveOps(base, "s-home", hero, true));
    expect(aiBlockOf(again, "s-home", hero)!.active).toBe(true);
  });
});

describe("«Desactualizado» and «El estilo cambió»", () => {
  it("a fresh AI block is up to date", () => {
    const { doc } = designed();
    expect(staleAiBlocks(doc, "s-home").size).toBe(0);
  });

  it("changing the block in the Layout (label, size) or its base copy makes it stale — also while it is in base [C12]", () => {
    const { doc, draft, hero, features } = designed();
    const relabeled = draft.map((screen) => ({ ...screen, layout: { ...screen.layout, blocks: { ...screen.layout.blocks, [hero]: { ...screen.layout.blocks[hero]!, label: "Portada" } } } }));
    const afterLayout = ok(withCarriedAiRender(doc, withGeneratedScreens(doc, relabeled), relabeled));
    expect([...staleAiBlocks(afterLayout, "s-home")]).toEqual([hero]);
    expect(isAiBlockStale(afterLayout, "s-home", hero)).toBe(true);
    expect(isAiBlockStale(afterLayout, "s-home", features)).toBe(false);

    const inBase = patched(doc, setAiBlockActiveOps(doc, "s-home", features, false));
    const element = inBase.screens["s-home"]!.page.elements[features]!;
    const title = Object.keys(element.props).find((key) => typeof element.props[key] === "string" && key !== "variant") ?? "title";
    const edited = patched(inBase, [{ op: "add", path: `/screens/s-home/page/elements/${features}/props/${title}`, value: "Todo lo que necesitas" }]);
    expect(staleAiBlocks(edited, "s-home").has(features)).toBe(true);
  });

  it("a new language keeps the AI blocks and marks them stale", () => {
    const { doc, hero } = designed();
    const english = ok(withCarriedAiRender(doc, withContentLocale(doc, "en", { rebuildPages: true })));
    expect(aiBlockOf(english, "s-home", hero)?.html).toBe(html(hero));
    expect(staleAiBlocks(english, "s-home").has(hero)).toBe(true);
  });

  it("a recipe change flags the active blocks designed with the old recipe (never redone automatically)", () => {
    const { doc, hero, features } = designed();
    expect(styleChangedAiBlocks(doc, "s-home").size).toBe(0);
    const restyled = patched(doc, [{ op: "replace", path: "/brief/recipeId", value: "editorial" }]);
    expect(styleChangedAiBlocks(restyled, "s-home")).toEqual(new Set([hero, features]));
    expect(isAiBlockStyleChanged(restyled, "s-home", hero)).toBe(true);
    expect(isAiBlockStyleChanged(doc, "s-home", hero)).toBe(false);
    expect(aiBlockOf(restyled, "s-home", hero)!.html).toBe(html(hero));
    const inBase = patched(restyled, setAiBlockActiveOps(restyled, "s-home", hero, false));
    expect(styleChangedAiBlocks(inBase, "s-home")).toEqual(new Set([features]));
  });
});

describe("AI blocks across «Generar»", () => {
  it("without the carry, a build would drop them (why the store hooks it)", () => {
    const { doc, draft } = designed();
    expect(ok(withGeneratedScreens(doc, draft)).screens["s-home"]!.aiRender).toBeUndefined();
  });

  it("a «Generar» without AI never deletes AI HTML", () => {
    const { doc, draft, hero, features } = designed();
    const again = ok(withCarriedAiRender(doc, withGeneratedScreens(doc, draft), draft));
    expect(Object.keys(again.screens["s-home"]!.aiRender!.blocks).sort()).toEqual([hero, features].sort());
    expect(staleAiBlocks(again, "s-home").size).toBe(0);
  });

  it("removing a block removes its AI block (to the screen's stash); bringing the block back brings it back", () => {
    const { doc, draft, hero, features } = designed();
    const removed = [without(draft[0]!, features)];
    const after = ok(withCarriedAiRender(doc, withGeneratedScreens(doc, removed), removed));
    expect(Object.keys(after.screens["s-home"]!.aiRender!.blocks)).toEqual([hero]);
    expect(Object.keys(after.screens["s-home"]!.aiRender!.stash!)).toEqual([features]);
    const back = ok(withCarriedAiRender(after, withGeneratedScreens(after, draft), draft));
    expect(Object.keys(back.screens["s-home"]!.aiRender!.blocks).sort()).toEqual([hero, features].sort());
    expect(back.screens["s-home"]!.aiRender!.stash).toBeUndefined();
    expect(aiBlockOf(back, "s-home", features)!.html).toBe(html(features));
  });

  it("the stash keeps the newest blocks only", () => {
    const { doc, hero } = designed();
    const stash = Object.fromEntries(Array.from({ length: MAX_AI_STASHED_BLOCKS }, (_, i) => [`b-gone-${i}`, aiBlock(doc, "s-home", hero)]));
    const crowded = patched(doc, [{ op: "add", path: "/screens/s-home/aiRender/stash", value: stash }]);
    const draft = crowded.screenOrder.map((id) => crowded.screens[id]!).map((screen) => ({ screenId: screen.id, name: screen.name, kind: screen.kind, route: screen.route, shell: screen.shell, layout: screen.layout }));
    const removed = [without(draft[0]!, hero)];
    const after = ok(withCarriedAiRender(crowded, withGeneratedScreens(crowded, removed), removed));
    const kept = Object.keys(after.screens["s-home"]!.aiRender!.stash!);
    expect(kept).toHaveLength(MAX_AI_STASHED_BLOCKS);
    expect(kept.at(-1)).toBe(hero);
    expect(kept).not.toContain("b-gone-0");
  });

  it("duplicating a screen keeps its AI blocks under the copy's block ids (root and prefixed ids remapped)", () => {
    const { doc, draft, hero, features } = designed();
    const copyIds = idFactory("c");
    const blocks: Record<string, string> = {};
    const copyLayoutBlocks: Record<string, LayoutBlock> = {};
    for (const id of Object.keys(draft[0]!.layout.blocks)) blocks[copyIds()] = id;
    const copyOfId = (sourceId: string) => Object.keys(blocks).find((key) => blocks[key] === sourceId)!;
    for (const [copyId, sourceId] of Object.entries(blocks)) {
      const { parentId, ...block } = draft[0]!.layout.blocks[sourceId]!;
      copyLayoutBlocks[copyId] = parentId ? { ...block, parentId: copyOfId(parentId) } : block;
    }
    const copy: GeneratedScreenInput = {
      ...draft[0]!,
      screenId: "s-home-2",
      name: "Inicio (copia)",
      route: "/inicio-2",
      layout: { ...draft[0]!.layout, blocks: copyLayoutBlocks },
      copyOf: { screenId: "s-home", blocks },
    };
    const both = [...draft, copy];
    const after = ok(withCarriedAiRender(doc, withGeneratedScreens(doc, both), both));
    const heroCopy = copyOfId(hero);
    const featuresCopy = copyOfId(features);
    const render = after.screens["s-home-2"]!.aiRender!;
    expect(Object.keys(render.blocks).sort()).toEqual([heroCopy, featuresCopy].sort());
    expect(render.blocks[heroCopy]!.html).toBe(html(heroCopy));
    // The source keeps its own.
    expect(aiBlockOf(after, "s-home", hero)!.html).toBe(html(hero));
    // Same copy, same layout: the copy is not stale.
    expect(staleAiBlocks(after, "s-home-2").size).toBe(0);
  });

  it("remaps only the block's own prefixed ids", () => {
    const block = aiBlock(designed().doc, "s-home", designed().hero);
    const other = { ...block, html: block.html.replace('aria-describedby="ai-', 'aria-describedby="ai-zzz ai-') };
    expect(remapAiBlock(other, designed().hero, "c-1").html).toContain('aria-describedby="ai-zzz ai-c-1-hint"');
  });

  it("a removed screen keeps its AI blocks in the screen stash, and a Layout undo brings them back", () => {
    const newId = idFactory();
    const draft = [draftScreen(newId, "s-home", "Inicio", "/", "home"), draftScreen(newId, "s-pricing", "Precios", "/precios", "pricing")];
    const base = ok(withGeneratedScreens(fresh(), draft));
    const hero = blockOf(draft[1]!, "hero") ?? Object.keys(draft[1]!.layout.blocks)[0]!;
    const doc = patched(base, setAiBlockOps(base, "s-pricing", hero, aiBlock(base, "s-pricing", hero)));
    const only = [draft[0]!];
    const removed = ok(withCarriedAiRender(doc, withGeneratedScreens(doc, only), only));
    expect(removed.screenStash?.["s-pricing"]?.aiRender?.blocks[hero]).toBeDefined();
    const back = ok(withCarriedAiRender(removed, withGeneratedScreens(removed, draft), draft));
    expect(aiBlockOf(back, "s-pricing", hero)?.html).toBe(html(hero));
  });

  it("holds the 1 MB cap by dropping stashed screens' AI first", () => {
    const { doc, hero, features } = designed();
    const fat = (id: string): AiBlock => ({ ...aiBlock(doc, "s-home", hero), html: `<section data-block-id="${id}">${"x".repeat(15_000)}</section>` });
    const many = (prefix: string, n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefix}-${i}`, fat(`${prefix}-${i}`)]));
    const home = { version: 1 as const, blocks: { [hero]: fat(hero), [features]: fat(features) }, stash: many("h", MAX_AI_STASHED_BLOCKS) };
    const before = { ...doc, screens: { ...doc.screens, "s-home": { ...doc.screens["s-home"]!, aiRender: home } } } as DesignDoc;
    const built = { ...doc.screens["s-home"]! };
    delete built.aiRender;
    const afterBuild = { ...doc, screens: { ...doc.screens, "s-home": built }, screenStash: { "s-old": { ...built, id: "s-old", aiRender: { version: 1 as const, blocks: many("o", 60) } } } } as DesignDoc;
    const ops = carryAiRenderOps(before, afterBuild);
    expect(ops[0]).toEqual({ op: "remove", path: "/screenStash/s-old/aiRender" });
    const added = ops.find((op) => op.op === "add") as { value: unknown };
    expect(aiRenderBytes({ screens: { "s-home": { aiRender: added.value } } })).toBeLessThanOrEqual(MAX_AI_RENDER_BYTES);
  });
});
