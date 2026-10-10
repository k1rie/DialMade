import { applyPatch, createDesignDoc, type AiBlock, type DesignDoc } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate, type ScreenTemplateId } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { withGeneratedScreens, type GeneratedScreenInput } from "@/lib/design-engine";
import { encodeSse, readRenderStream, RenderBlockSchema, RenderBrandSchema, type RenderStreamEvent } from "../api";
import { estimateGenerate, formatRenderCost } from "./cost";
import { createFreeTierTransport } from "./freeTier";
import { aiBlockActiveOps, aiBlockOps } from "./patches";
import { defaultScreenPick, pickedScreens, planKit, requestBrand, screenBlocks } from "./plan";

function doc4(): DesignDoc {
  let n = 0;
  const newId = () => `b-${(++n).toString(36).padStart(4, "0")}`;
  const screen = (id: string, route: string, templateId: ScreenTemplateId): GeneratedScreenInput => {
    const template = getScreenTemplate(templateId);
    const { layout, shell } = instantiateTemplate(template, { label: (type) => type, newId });
    return { screenId: id, name: id, kind: template.kind ?? "landing", route, shell, layout };
  };
  const result = withGeneratedScreens(
    createDesignDoc({ brand: { name: "Brisa", seeds: { primary: "#0f766e" } }, brief: { productType: "saas-general", locale: "es" }, provenance: { createdAt: "2026-10-10T09:00:00.000Z" } }),
    [screen("s-a", "/", "home"), screen("s-b", "/b", "pricing"), screen("s-c", "/c", "pricing"), screen("s-d", "/d", "home")],
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.doc;
}

const aiBlock = (html: string, directionId = "d-1"): AiBlock => ({
  html,
  active: true,
  basis: "x",
  gates: { contrast: "ok", responsive: "ok", dropped: 0, warnings: [] },
  provenance: { kind: "generate", path: "free", createdAt: "2026-10-10T12:00:00.000Z", promptVersion: "ai-render/1", directionId, seed: 1 },
});

const typeOf = (doc: DesignDoc, screenId: string, type: string) => Object.entries(doc.screens[screenId]!.layout.blocks).find(([, block]) => block.type === type)![0];

describe("which screens", () => {
  it("defaults to the first 3 screens without AI blocks; a pick keeps document order and the cap", () => {
    const doc = doc4();
    expect(defaultScreenPick(doc)).toEqual(["s-a", "s-b", "s-c"]);
    const withAi = applyPatch(doc, aiBlockOps(doc, "s-a", typeOf(doc, "s-a", "hero"), aiBlock('<section data-block-id="x"></section>'))!);
    if (!withAi.ok) throw new Error(withAi.error.message);
    expect(defaultScreenPick(withAi.doc)).toEqual(["s-b", "s-c", "s-d"]);
    expect(pickedScreens(doc, ["s-d", "s-a", "gone"])).toEqual(["s-a", "s-d"]);
    expect(pickedScreens(doc, ["s-d", "s-c", "s-b", "s-a"])).toEqual(["s-a", "s-b", "s-c"]);
  });
});

describe("the request", () => {
  it("brand and blocks fit the route's schemas (no hex colors, prose capped)", () => {
    const doc = doc4();
    const brand = requestBrand(doc);
    expect(RenderBrandSchema.safeParse(brand).success).toBe(true);
    expect(JSON.stringify(brand)).not.toMatch(/#[0-9a-f]{6}/i);
    for (const block of screenBlocks(doc, "s-a").blocks) expect(RenderBlockSchema.safeParse(block).success).toBe(true);
  });
});

describe("the shared kit", () => {
  it("first occurrence is asked for, the others clone it", () => {
    const doc = doc4();
    const ids = ["s-a", "s-b", "s-c"];
    const inputs = new Map(ids.map((id) => [id, screenBlocks(doc, id)]));
    const plan = planKit(doc, ids, inputs, "d-1");
    expect(plan.skip.get("s-a")).toBeUndefined();
    expect([...plan.skip.get("s-b")!].sort()).toEqual([typeOf(doc, "s-b", "navbar"), typeOf(doc, "s-b", "footer")].sort());
    expect(plan.clones).toContainEqual({ from: { screenId: "s-a", blockId: typeOf(doc, "s-a", "navbar") }, to: { screenId: "s-c", blockId: typeOf(doc, "s-c", "navbar") } });
    expect(plan.existing).toEqual([]);
  });

  it("a piece the document already has with the same direction is cloned on every screen of the run", () => {
    let doc = doc4();
    const nav = typeOf(doc, "s-d", "navbar");
    const result = applyPatch(doc, aiBlockOps(doc, "s-d", nav, aiBlock(`<nav data-block-id="${nav}"></nav>`))!);
    if (!result.ok) throw new Error(result.error.message);
    doc = result.doc;
    const ids = ["s-a", "s-b"];
    const inputs = new Map(ids.map((id) => [id, screenBlocks(doc, id)]));
    const plan = planKit(doc, ids, inputs, "d-1");
    expect(plan.existing.map((clone) => clone.to.screenId)).toEqual(["s-a", "s-b"]);
    expect(plan.existing.every((clone) => clone.from.blockId === nav)).toBe(true);
    // Another direction: generated again.
    expect(planKit(doc, ids, inputs, "d-2").existing).toEqual([]);
  });
});

describe("patches", () => {
  it("«Volver al diseño base» keeps the HTML; nothing to do when it is already so", () => {
    const doc = doc4();
    const hero = typeOf(doc, "s-a", "hero");
    const stored = applyPatch(doc, aiBlockOps(doc, "s-a", hero, aiBlock(`<section data-block-id="${hero}"></section>`))!);
    if (!stored.ok) throw new Error(stored.error.message);
    const off = applyPatch(stored.doc, aiBlockActiveOps(stored.doc, "s-a", hero, false)!);
    if (!off.ok) throw new Error(off.error.message);
    expect(off.doc.screens["s-a"]!.aiRender!.blocks[hero]).toMatchObject({ active: false, html: `<section data-block-id="${hero}"></section>` });
    expect(aiBlockActiveOps(off.doc, "s-a", hero, false)).toBeNull();
    expect(aiBlockOps(doc, "s-a", "b-gone", aiBlock(""))).toBeNull();
  });
});

describe("the cost line", () => {
  it("3 screens of 6 blocks with Haiku 5.5: ≈ $0.013 and ≈ 30 s (spec §10.1)", () => {
    const estimate = estimateGenerate({ blocksPerScreen: [6, 6, 6], direction: true, model: "claude-haiku-5-5" });
    expect(formatRenderCost(estimate.costUsd, "es")).toBe("$0.013");
    expect(formatRenderCost(0.62, "en")).toBe("$0.62");
    expect(estimate.seconds).toBe(30);
    expect(estimate.screens).toBe(3);
    // The direction reused: cheaper and sooner.
    const reused = estimateGenerate({ blocksPerScreen: [6, 6, 6], direction: false, model: "claude-haiku-5-5" });
    expect(reused.costUsd).toBeLessThan(estimate.costUsd);
    expect(reused.seconds).toBeLessThanOrEqual(estimate.seconds);
  });
});

describe("free-tier transport", () => {
  const stream = (events: RenderStreamEvent[]) =>
    new Response(new Blob(events.map(encodeSse)).stream(), { status: 200, headers: { "Content-Type": "text/event-stream; charset=utf-8" } });

  it("streams the SSE events of a screen; a JSON refusal becomes one error event", async () => {
    const events: RenderStreamEvent[] = [
      { type: "block", blockId: "b-1", html: "<section></section>", forced: false },
      { type: "done", session: null },
    ];
    const ok = createFreeTierTransport(async () => stream(events));
    const out: RenderStreamEvent[] = [];
    for await (const event of ok.screen({} as never, new AbortController().signal)) out.push(event);
    expect(out).toEqual(events);

    const refused = createFreeTierTransport(async () => Response.json({ code: "session-exhausted", message: "x" }, { status: 402 }));
    const errors: RenderStreamEvent[] = [];
    for await (const event of refused.screen({} as never, new AbortController().signal)) errors.push(event);
    expect(errors).toEqual([{ type: "error", error: { code: "session-exhausted", message: "x" } }]);
  });

  it("never throws: network and abort are error codes", async () => {
    const offline = createFreeTierTransport(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await offline.openSession({ screens: 1 })).toEqual({ ok: false, error: { code: "network", message: "Could not reach the server" } });
    const aborted = createFreeTierTransport(async () => {
      throw new DOMException("x", "AbortError");
    });
    expect(await aborted.block({} as never)).toMatchObject({ ok: false, error: { code: "aborted" } });
    const events: RenderStreamEvent[] = [];
    for await (const event of aborted.screen({} as never, new AbortController().signal)) events.push(event);
    expect(events).toEqual([{ type: "error", error: { code: "aborted", message: "Request aborted" } }]);
    // The reader round-trips.
    const back: RenderStreamEvent[] = [];
    for await (const event of readRenderStream(stream([{ type: "progress", received: 10 }]).body!)) back.push(event);
    expect(back).toEqual([{ type: "progress", received: 10 }]);
  });
});
