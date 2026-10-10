import { processBlock } from "@dialmade/ai-render";
import { applyPatch } from "@dialmade/doc";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDesignDocStore, loadDesignEngine } from "@/hooks/useDesignDoc";
import { designEngine } from "@/lib/design-engine";
import type { RenderBlockBody, RenderBlockSuccess, RenderSessionCounters } from "./api";
import { RenderBlockBodySchema } from "./api";
import { BlockActionError, blockActionBody, freeTierBlockTransport, openFreeSession, runBlockAction, type BlockActionTransport } from "./blockAction";
import { aiBlockOf, isAiBlockStale, setAiBlockOps } from "./edit";
import { designedDoc, unwrap } from "./editFixtures";

const counters: RenderSessionCounters = { directionsUsed: 1, directionsMax: 2, screensUsed: 1, screensMax: 3, actionsUsed: 3, actionsMax: 10, expiresAt: "2026-10-11T12:00:00.000Z" };
const SESSION = "6f1c1d2e-8a8b-4c4d-9e9f-0a1b2c3d4e5f";

/** A fake transport that answers with `html` and records what it was sent. */
function fakeTransport(html: string | null, sent: RenderBlockBody[] = []): BlockActionTransport {
  return {
    path: "free",
    usesSession: true,
    run: async (body) => {
      sent.push(body);
      return { html, usage: { model: "claude-haiku-5-5", inputTokens: 4000, outputTokens: 900, cacheReadTokens: 2279, costUsd: 0.00095 }, session: { ...counters, actionsUsed: 4 } } satisfies RenderBlockSuccess;
    },
  };
}

const process = async (raw: string, context: Parameters<typeof processBlock>[1]) => processBlock(raw, context);

describe("block action body", () => {
  it("is a valid wire body: the block's data, its current HTML, the direction, never hex colors", () => {
    const { doc, hero } = designedDoc({ direction: true });
    const reroll = blockActionBody(doc, "s-home", hero, { kind: "reroll" }, { sessionId: SESSION, seed: 42 });
    expect(RenderBlockBodySchema.safeParse(reroll).success).toBe(true);
    expect(reroll.action).toEqual({ kind: "reroll", seed: 42 });
    expect(reroll.block.id).toBe(hero);
    expect(reroll.html).toBe(aiBlockOf(doc, "s-home", hero)!.html);
    expect(JSON.stringify(reroll.brand)).not.toMatch(/#[0-9a-f]{6}/i);
    expect(reroll.direction).toEqual({ axes: doc.aiRender!.direction!.axes, moves: doc.aiRender!.direction!.moves, rationale: doc.aiRender!.direction!.rationale });

    const change = blockActionBody(doc, "s-home", hero, { kind: "change", request: `  ${"x".repeat(600)}  `, target: { text: "Ver demo" } }, { sessionId: SESSION, seed: 1 });
    expect(RenderBlockBodySchema.safeParse(change).success).toBe(true);
    expect(change.action).toEqual({ kind: "change", request: "x".repeat(500), target: { text: "Ver demo" } });
  });

  it("refuses a block without AI design or a document without direction", () => {
    const { doc, hero } = designedDoc();
    expect(() => blockActionBody(doc, "s-home", hero, { kind: "reroll" }, { sessionId: SESSION, seed: 1 })).toThrow(BlockActionError);
    const withDirection = designedDoc({ direction: true });
    expect(() => blockActionBody(withDirection.doc, "s-home", "b-nope", { kind: "reroll" }, { sessionId: SESSION, seed: 1 })).toThrow(/no AI design/);
  });
});

describe("runBlockAction", () => {
  it("«Pedir cambio»: the answer passes the same gates (sanitized), keeps its seed and records the request and recipe", async () => {
    const { doc, hero } = designedDoc({ direction: true });
    const sent: RenderBlockBody[] = [];
    const raw = `<section data-block-id="${hero}" class="@container bg-primary py-section" onclick="alert(1)"><h1 class="text-h1 text-primary-foreground">Agenda en dos toques</h1><a href="javascript:alert(1)" style="color:red" class="text-primary-foreground">Ver demo</a><form><button type="submit" class="text-primary-foreground">Go</button></form></section>`;
    const result = await runBlockAction(doc, "s-home", hero, { kind: "change", request: "Fondo de marca", target: { text: "Ver demo" } }, {
      transport: fakeTransport(raw, sent),
      sessionId: SESSION,
      process,
      now: () => new Date("2026-10-10T13:00:00.000Z"),
    });
    expect(sent[0]!.sessionId).toBe(SESSION);
    expect(result.block.html).toContain("Agenda en dos toques");
    expect(result.block.html).not.toMatch(/onclick|javascript:|style=|<form|type="submit"/);
    expect(result.block.active).toBe(true);
    expect(result.block.provenance).toMatchObject({
      kind: "change",
      path: "free",
      model: "claude-haiku-5-5",
      createdAt: "2026-10-10T13:00:00.000Z",
      costUsd: 0.00095,
      request: "Fondo de marca",
      seed: aiBlockOf(doc, "s-home", hero)!.provenance.seed,
      directionId: "dir-1",
      recipeId: doc.brief.recipeId,
    });
    expect(result.session?.actionsUsed).toBe(4);
    // Written back as ONE patch, and up to date.
    const next = unwrap(applyPatch(doc, setAiBlockOps(doc, "s-home", hero, result.block)));
    expect(isAiBlockStale(next, "s-home", hero)).toBe(false);
  });

  it("«Otra versión» draws a new seed", async () => {
    const { doc, hero } = designedDoc({ direction: true });
    const sent: RenderBlockBody[] = [];
    const raw = `<section data-block-id="${hero}" class="@container py-section"><h1 class="text-h1 text-foreground">Otra</h1></section>`;
    const result = await runBlockAction(doc, "s-home", hero, { kind: "reroll" }, { transport: fakeTransport(raw, sent), sessionId: SESSION, process });
    expect(sent[0]!.action.kind).toBe("reroll");
    expect(result.block.provenance.kind).toBe("reroll");
    expect(result.block.provenance.seed).toBe((sent[0]!.action as { seed: number }).seed);
    expect(result.block.provenance.request).toBeUndefined();
  });

  it("an answer that fails the gates leaves the block as it was (gates-failed); no root → invalid-response; no session → no-session", async () => {
    const { doc, hero } = designedDoc({ direction: true });
    const hostile = `<section data-block-id="${hero}" class="@container"><svg><script>alert(1)</script></svg></section>`;
    await expect(runBlockAction(doc, "s-home", hero, { kind: "reroll" }, { transport: fakeTransport(hostile), sessionId: SESSION, process })).rejects.toMatchObject({ code: "gates-failed" });
    await expect(runBlockAction(doc, "s-home", hero, { kind: "reroll" }, { transport: fakeTransport(null), sessionId: SESSION, process })).rejects.toMatchObject({ code: "invalid-response" });
    await expect(runBlockAction(doc, "s-home", hero, { kind: "reroll" }, { transport: fakeTransport("<section></section>"), sessionId: null, process })).rejects.toMatchObject({ code: "no-session" });
  });

  it("the new version is one undo step in the store", async () => {
    const { doc, hero } = designedDoc({ direction: true });
    await loadDesignEngine(async () => designEngine);
    const store = createDesignDocStore({ doc, engineReady: true });
    const raw = `<section data-block-id="${hero}" class="@container py-section"><h1 class="text-h1 text-foreground">Nueva</h1></section>`;
    const { block } = await runBlockAction(doc, "s-home", hero, { kind: "reroll" }, { transport: fakeTransport(raw), sessionId: SESSION, process });
    const live = store.getState().doc!;
    expect(store.getState().actions.applyPatch(setAiBlockOps(live, "s-home", hero, block)).ok).toBe(true);
    expect(store.temporal.getState().pastStates).toHaveLength(1);
    expect(aiBlockOf(store.getState().doc!, "s-home", hero)!.html).toContain("Nueva");
    store.temporal.getState().undo();
    expect(aiBlockOf(store.getState().doc!, "s-home", hero)!.html).toBe(aiBlockOf(doc, "s-home", hero)!.html);
  });
});

describe("free tier transport", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts the body to /api/ai/render/block and maps error bodies (with the session's counters)", async () => {
    const calls: [string, RequestInit][] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push([url, init]);
      return Response.json({ code: "session-exhausted", message: "No actions left", session: { ...counters, actionsUsed: 10 } }, { status: 402 });
    });
    const { doc, hero } = designedDoc({ direction: true });
    const body = blockActionBody(doc, "s-home", hero, { kind: "reroll" }, { sessionId: SESSION, seed: 1 });
    const error = await freeTierBlockTransport.run(body).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BlockActionError);
    expect(error).toMatchObject({ code: "session-exhausted", session: { actionsUsed: 10 } });
    expect(calls[0]![0]).toBe("/api/ai/render/block");
    expect(JSON.parse(String(calls[0]![1].body))).toEqual(body);
  });

  it("opens a session for block actions with the session's screen allowance", async () => {
    const calls: unknown[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(String(init.body)));
      return Response.json({ sessionId: SESSION, session: counters, freeUsesRemaining: 4, freeUsesTotal: 5, remainingBudgetUsd: 4.9 });
    });
    expect((await openFreeSession()).sessionId).toBe(SESSION);
    expect(calls).toEqual([{ screens: 3 }]);
  });

  it("a network failure and an abort have their own codes", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(openFreeSession()).rejects.toMatchObject({ code: "network" });
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("Aborted", "AbortError");
    });
    await expect(openFreeSession()).rejects.toMatchObject({ code: "aborted" });
  });
});
