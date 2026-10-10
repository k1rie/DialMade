import { processBlock, type BlockContext } from "@dialmade/ai-render";
import { applyPatch, createDesignDoc, type DesignDoc } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate, type ScreenTemplateId } from "@dialmade/layout";
import { describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import { withGeneratedScreens, type GeneratedScreenInput } from "@/lib/design-engine";
import type { RenderBlockBody, RenderBlockSuccess, RenderDirectionSuccess, RenderSessionCounters, RenderSessionSuccess, RenderStreamEvent } from "../api";
import { IDLE_GENERATION, createGenerationEngine, type GenerationDeps } from "./engine";
import type { PatchOp } from "./patches";
import type { GenerationState, RenderTransport, ScreenBody, TransportResult } from "./types";

const NOW = new Date("2026-10-10T12:00:00Z");
const COUNTERS: RenderSessionCounters = { directionsUsed: 0, directionsMax: 2, screensUsed: 0, screensMax: 2, actionsUsed: 0, actionsMax: 10, expiresAt: "2026-10-11T12:00:00Z" };
const SESSION = "11111111-2222-4333-8444-555555555555";

function baseDoc(): DesignDoc {
  let n = 0;
  const newId = () => `b-${(++n).toString(36).padStart(4, "0")}`;
  const screen = (id: string, name: string, route: string, templateId: ScreenTemplateId): GeneratedScreenInput => {
    const { layout, shell } = instantiateTemplate(getScreenTemplate(templateId), { label: (type) => type, newId });
    return { screenId: id, name, kind: "landing", route, shell, layout };
  };
  const result = withGeneratedScreens(
    createDesignDoc({
      brand: { name: "Brisa", seeds: { primary: "#0f766e" } },
      brief: { productType: "saas-general", locale: "es", recipeId: "soft-ui" },
      provenance: { createdAt: "2026-10-10T09:00:00.000Z" },
    }),
    [screen("s-home", "Inicio", "/", "home"), screen("s-pricing", "Precios", "/precios", "pricing")],
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.doc;
}

/** A block the vocabulary accepts; kit pieces link to both screens. */
function blockHtml(id: string, type: string): string {
  if (type === "navbar" || type === "footer") {
    return `<nav data-block-id="${id}" class="flex gap-4 p-4 bg-background"><a href="#screen:s-home" class="text-foreground">Inicio</a><a href="#screen:s-pricing" class="text-foreground">Precios</a></nav>`;
  }
  const heading = type === "hero" ? "h1" : "h2";
  return `<section data-block-id="${id}" class="@container py-section bg-background"><${heading} class="text-h2 text-foreground">${type}</${heading}><p class="text-body text-foreground">Texto de ${type}</p></section>`;
}

type ScreenScript = (body: ScreenBody, signal: AbortSignal) => AsyncGenerator<RenderStreamEvent>;

/** Answers every block of the request, in order, then usage and done. */
const answerAll: ScreenScript = async function* (body) {
  for (const block of body.screen.blocks) yield { type: "block", blockId: block.id, html: blockHtml(block.id, block.type), forced: false };
  yield { type: "usage", usage: { model: "claude-haiku-5-5", inputTokens: 100, outputTokens: 1000, cacheReadTokens: 0, costUsd: 0.004 } };
  yield { type: "done", session: { ...COUNTERS, screensUsed: 1 } };
};

function fakeTransport(script: ScreenScript = answerAll, options: { direction?: "ok" | "fail" } = {}) {
  const screens: ScreenBody[] = [];
  const transport = {
    path: "free" as const,
    openSession: vi.fn(async (): Promise<TransportResult<RenderSessionSuccess>> => ({ ok: true as const, value: { sessionId: SESSION, session: COUNTERS, freeUsesRemaining: 4, freeUsesTotal: 5, remainingBudgetUsd: 4.9 } })),
    direction: vi.fn(async (): Promise<TransportResult<RenderDirectionSuccess>> =>
      options.direction === "fail"
        ? { ok: false as const, error: { code: "upstream-error" as const, message: "boom" } }
        : {
            ok: true as const,
            value: {
              direction: {
                axes: { composition: "editorial", typeVoice: "quiet", decoration: "none", imagery: "icon-led", colorStrategy: "brand-forward", rhythm: "airy" },
                moves: ["Cards with a border and no shadow"],
                rationale: "Calma y aire",
              },
              usage: { model: "claude-haiku-5-5", inputTokens: 2000, outputTokens: 400, cacheReadTokens: 0, costUsd: 0.0015 },
              session: { ...COUNTERS, directionsUsed: 1 },
            },
          },
    ),
    screen: vi.fn((body: ScreenBody, signal: AbortSignal) => {
      screens.push(body);
      return script(body, signal);
    }),
    block: vi.fn(async (body: RenderBlockBody): Promise<TransportResult<RenderBlockSuccess>> => ({
      ok: true as const,
      value: { html: blockHtml(body.block.id, body.block.type), usage: { model: "claude-haiku-5-5", inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, costUsd: 0.001 }, session: { ...COUNTERS, actionsUsed: 1 } },
    })),
  } satisfies RenderTransport;
  return { transport, screens };
}

function setup(transport: RenderTransport, doc: DesignDoc = baseDoc()) {
  let current = doc;
  const writes: PatchOp[][] = [];
  const store = createStore<GenerationState>()(() => IDLE_GENERATION);
  const deps: GenerationDeps = {
    transport: () => transport,
    process: async (raw: string, context: BlockContext) => processBlock(raw, context),
    getDoc: () => current,
    applyPatch: (ops) => {
      const result = applyPatch(current, ops);
      if (!result.ok) return false;
      writes.push(ops);
      current = result.doc;
      return true;
    },
    model: () => "claude-haiku-5-5",
    now: () => NOW,
    seed: () => 42,
  };
  const engine = createGenerationEngine(store, deps);
  return { engine, store, writes, doc: () => current };
}

const ids = (doc: DesignDoc, screenId: string) => Object.keys(doc.screens[screenId]!.aiRender?.blocks ?? {});

describe("«Generar con IA» (engine)", () => {
  it("session → direction → screens: every block becomes an active AI block, one patch each, and the layout never changes", async () => {
    const { transport, screens } = fakeTransport();
    const { engine, store, writes, doc } = setup(transport);
    const before = doc();
    await engine.start({ screenIds: ["s-home", "s-pricing"], chip: "auto" });

    expect(transport.openSession).toHaveBeenCalledOnce();
    expect(transport.openSession).toHaveBeenCalledWith({ screens: 2 }, expect.anything());
    expect(transport.direction).toHaveBeenCalledOnce();
    const state = store.getState();
    expect(state.phase).toBe("done");
    expect(state.direction).toEqual({ rationale: "Calma y aire", fromModel: true });

    const after = doc();
    expect(after.aiRender?.direction).toMatchObject({ id: "d-16", seed: 42, chip: "auto", rationale: "Calma y aire", provenance: { kind: "direction", path: "free" } });
    for (const screenId of ["s-home", "s-pricing"]) {
      // The layout and the deterministic page are untouched.
      expect(after.screens[screenId]!.layout).toBe(before.screens[screenId]!.layout);
      expect(after.screens[screenId]!.page).toBe(before.screens[screenId]!.page);
      const run = state.screens[screenId]!;
      expect(run.phase).toBe("done");
      for (const blockId of run.order) expect(run.blocks[blockId]!.phase).toBe("done");
      expect(ids(after, screenId).sort()).toEqual([...run.order].sort());
      for (const block of Object.values(after.screens[screenId]!.aiRender!.blocks)) {
        expect(block).toMatchObject({ active: true, provenance: { kind: "generate", path: "free", model: "claude-haiku-5-5", directionId: "d-16" } });
      }
    }
    // One patch for the direction, one per block.
    const blocks = state.screens["s-home"]!.order.length + state.screens["s-pricing"]!.order.length;
    expect(writes).toHaveLength(1 + blocks);
    expect(screens).toHaveLength(2);
    expect(state.costUsd).toBeCloseTo(0.0095);
  });

  it("the kit is asked for once and cloned, with the clone's own screen as the current link", async () => {
    const { transport, screens } = fakeTransport();
    const { engine, store, doc } = setup(transport);
    await engine.start({ screenIds: ["s-home", "s-pricing"], chip: "auto" });
    const pricing = screens.find((body) => body.screen.id === "s-pricing")!;
    expect(pricing.screen.blocks.map((block) => block.type)).not.toContain("navbar");
    expect(pricing.screen.blocks.map((block) => block.type)).not.toContain("footer");
    const layout = doc().screens["s-pricing"]!.layout;
    const navId = Object.keys(layout.blocks).find((id) => layout.blocks[id]!.type === "navbar")!;
    const nav = doc().screens["s-pricing"]!.aiRender!.blocks[navId]!;
    expect(nav.html).toContain(`data-block-id="${navId}"`);
    expect(nav.html).toMatch(/<a [^>]*href="#screen:s-pricing"[^>]*aria-current="page"/);
    expect(nav.html.match(/aria-current/g)).toHaveLength(1);
    expect(store.getState().screens["s-pricing"]!.blocks[navId]).toMatchObject({ phase: "done", cloneOf: { screenId: "s-home" } });
  });

  it("a block that fails the gates or never arrives stays on the base design with its failure", async () => {
    const script: ScreenScript = async function* (body) {
      const [first, second, ...rest] = body.screen.blocks;
      yield { type: "block", blockId: first!.id, html: `<section data-block-id="${first!.id}"><script>alert(1)</script><p>x</p></section>`, forced: false };
      // A root for a block that is not on this screen is ignored, and so is a duplicate.
      yield { type: "block", blockId: "b-intruder", html: blockHtml("b-intruder", "hero"), forced: false };
      for (const block of rest) yield { type: "block", blockId: block.id, html: blockHtml(block.id, block.type), forced: false };
      yield { type: "block", blockId: rest[0]!.id, html: blockHtml(rest[0]!.id, "cta"), forced: false };
      void second;
      yield { type: "done", session: COUNTERS };
    };
    const { transport } = fakeTransport(script);
    const { engine, store, doc } = setup(transport);
    await engine.start({ screenIds: ["s-home"], chip: "auto" });
    const run = store.getState().screens["s-home"]!;
    const [first, second] = run.order;
    expect(run.blocks[first!]).toMatchObject({ phase: "failed", failure: "gates" });
    expect(run.blocks[second!]).toMatchObject({ phase: "failed", failure: "missing" });
    expect(ids(doc(), "s-home")).not.toContain(first);
    expect(ids(doc(), "s-home")).not.toContain(second);
    expect(ids(doc(), "s-home")).not.toContain("b-intruder");
    expect(run.phase).toBe("done");
    expect(store.getState().announcement).toMatchObject({ screenId: "s-home", base: 2, ai: run.order.length - 2 });
  });

  it("a failed screen is retried in the same session, only for what is missing", async () => {
    let calls = 0;
    const script: ScreenScript = async function* (body, signal) {
      calls++;
      if (calls === 1) {
        yield { type: "block", blockId: body.screen.blocks[0]!.id, html: blockHtml(body.screen.blocks[0]!.id, body.screen.blocks[0]!.type), forced: false };
        yield { type: "error", error: { code: "upstream-error", message: "boom", session: COUNTERS } };
        yield { type: "done", session: COUNTERS };
        return;
      }
      yield* answerAll(body, signal);
    };
    const { transport, screens } = fakeTransport(script);
    const { engine, store, doc } = setup(transport);
    await engine.start({ screenIds: ["s-pricing"], chip: "auto" });
    expect(store.getState().screens["s-pricing"]).toMatchObject({ phase: "failed", error: "upstream-error" });
    const firstAsked = screens[0]!.screen.blocks.map((block) => block.id);

    await engine.retryScreen("s-pricing");
    expect(transport.openSession).toHaveBeenCalledOnce();
    expect(screens).toHaveLength(2);
    expect(screens[1]!.sessionId).toBe(SESSION);
    expect(screens[1]!.screen.blocks.map((block) => block.id)).toEqual(firstAsked.slice(1));
    const run = store.getState().screens["s-pricing"]!;
    expect(run.phase).toBe("done");
    expect(ids(doc(), "s-pricing").sort()).toEqual([...run.order].sort());
    expect(store.getState().phase).toBe("done");
  });

  it("cancel keeps what is done; the rest stays on the base design without a badge", async () => {
    const script: ScreenScript = async function* (body, signal) {
      const [first] = body.screen.blocks;
      yield { type: "block", blockId: first!.id, html: blockHtml(first!.id, first!.type), forced: false };
      await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }));
      yield { type: "error", error: { code: "aborted", message: "aborted" } };
    };
    const { transport } = fakeTransport(script);
    const { engine, store, doc } = setup(transport);
    const started = engine.start({ screenIds: ["s-home"], chip: "auto" });
    await vi.waitFor(() => expect(store.getState().screens["s-home"]!.blocks[store.getState().screens["s-home"]!.order[0]!]!.phase).toBe("done"));
    engine.cancel();
    await started;
    const state = store.getState();
    expect(state.phase).toBe("cancelled");
    // The free tier's screen call finishes and is paid (the bar says so); BYOK's would stop.
    expect(state.cancel).toEqual({ billing: "finishes" });
    const run = state.screens["s-home"]!;
    expect(run.phase).toBe("cancelled");
    expect(ids(doc(), "s-home")).toEqual([run.order[0]]);
    for (const blockId of run.order.slice(1)) expect(run.blocks[blockId]!.phase).toBe("cancelled");
  });

  it("no session (free uses spent): nothing is asked and the doc is untouched", async () => {
    const { transport } = fakeTransport();
    transport.openSession.mockResolvedValueOnce({ ok: false, error: { code: "free-tier-exhausted", message: "x" } });
    const { engine, store, doc } = setup(transport);
    const before = doc();
    await engine.start({ screenIds: ["s-home"], chip: "auto" });
    expect(store.getState()).toMatchObject({ phase: "failed", error: "free-tier-exhausted" });
    expect(transport.direction).not.toHaveBeenCalled();
    expect(transport.screen).not.toHaveBeenCalled();
    expect(doc()).toBe(before);
  });

  it("a failed direction call falls back to the code's pick; an existing direction is reused", async () => {
    const { transport } = fakeTransport(answerAll, { direction: "fail" });
    const { engine, store, doc } = setup(transport);
    await engine.start({ screenIds: ["s-home"], chip: "warm" });
    expect(store.getState().direction).toEqual({ rationale: "", fromModel: false });
    expect(doc().aiRender?.direction).toMatchObject({ chip: "warm", axes: { typeVoice: "humanist", decoration: "soft-shapes" } });
    expect(store.getState().phase).toBe("done");

    const again = fakeTransport();
    const second = setup(again.transport, doc());
    await second.engine.start({ screenIds: ["s-pricing"], chip: "auto" });
    expect(again.transport.direction).not.toHaveBeenCalled();
    expect(again.screens[0]!.direction.axes).toEqual(doc().aiRender!.direction!.axes);
  });

  it("a failed block is retried as one block action of the session", async () => {
    const script: ScreenScript = async function* (body) {
      for (const block of body.screen.blocks.slice(1)) yield { type: "block", blockId: block.id, html: blockHtml(block.id, block.type), forced: false };
      yield { type: "done", session: COUNTERS };
    };
    const { transport } = fakeTransport(script);
    const { engine, store, doc } = setup(transport);
    await engine.start({ screenIds: ["s-pricing"], chip: "auto" });
    const first = store.getState().screens["s-pricing"]!.order[0]!;
    expect(store.getState().screens["s-pricing"]!.blocks[first]!.phase).toBe("failed");
    await engine.retryBlock("s-pricing", first);
    expect(transport.block).toHaveBeenCalledWith(expect.objectContaining({ sessionId: SESSION, action: { kind: "reroll", seed: 42 }, block: expect.objectContaining({ id: first }) }));
    expect(store.getState().screens["s-pricing"]!.blocks[first]!.phase).toBe("done");
    expect(doc().screens["s-pricing"]!.aiRender!.blocks[first]!.provenance.kind).toBe("reroll");
    expect(store.getState().session?.counters?.actionsUsed).toBe(1);
  });
});
