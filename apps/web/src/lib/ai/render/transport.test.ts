import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiCaller } from "../access";
import type { AiStatusResponse } from "../api";
import { memoryAiLedger, resetAiLedger } from "../budget";
import { OFFLINE_AI_STATUS } from "../policy";
import type { AiServerConfig } from "../serverConfig";
import { message } from "../testing";
import { RENDER_BLOCK_ENDPOINT, RENDER_ENDPOINT, RENDER_SESSION_ENDPOINT, type RenderBlockBody, type RenderRequestBody, type RenderSessionBody } from "./api";
import { openRenderSession, renderBlock, renderDirection, renderJsonResponse, renderScreen, renderStreamResponse, type RenderContext } from "./server";
import { BRAND, DIRECTION, blocksOf, collect, screenFixture, screenOnly as toScreenOnly } from "./testing";
import { createRenderTransport, freeTransport, renderPathFor, resetScreenGates, RenderTransportError } from "./transport";

const NOW = new Date("2026-10-10T12:00:00Z");
const config: AiServerConfig = {
  apiKey: "sk-ant-server",
  model: "claude-opus-5-5",
  freeModel: "claude-haiku-5-5",
  effort: "low",
  monthlyBudgetUsd: 5,
  maxRequestsPerIpPerDay: 10,
  freeUsesPerMonth: 5,
  deviceSecret: "s".repeat(64),
  production: false,
  serverless: false,
};
const caller: AiCaller = { deviceId: "device-a", ipHash: "ip-a", setCookie: null };
const HTML = '<section data-block-id="b-hero" class="@container"><h1>Hola</h1></section><section data-block-id="b-cta"><p>Empieza</p></section>';
const screen = screenFixture("s-home", ["b-hero", "b-cta"]);

/** A mocked Anthropic client whose stream yields `text` slowly, with an event log. */
function slowClient(text = HTML, log: string[] = []) {
  const countTokens = vi.fn(async () => ({ input_tokens: 4000 }));
  const create = vi.fn(async () => message({ model: "claude-haiku-5-5", output: { axes: DIRECTION.axes, moves: [DIRECTION.moves[0]], rationale: "Porque sí" } }));
  const stream = vi.fn((params: { messages: { content: { text: string }[] }[] }) => {
    const id = params.messages[0]!.content[1]!.text.includes('"s-two"') ? "two" : "one";
    log.push(`upstream ${id}`);
    const chunks = text.match(/[\s\S]{1,16}/g) ?? [];
    return {
      async *[Symbol.asyncIterator]() {
        log.push(`message_start ${id}`);
        yield { type: "message_start" };
        for (const chunk of chunks) {
          await new Promise((resolve) => setTimeout(resolve, 1));
          yield { type: "content_block_delta", delta: { type: "text_delta", text: chunk } };
        }
      },
      abort: vi.fn(),
      finalMessage: async () => message({ model: "claude-haiku-5-5", output: text, usage: { input_tokens: 2000, output_tokens: 3000, cache_creation_input_tokens: 0, cache_read_input_tokens: 2400 } }),
    };
  });
  return { client: { beta: { messages: { countTokens, create, stream } } } as unknown as Anthropic, stream };
}

let ledger = memoryAiLedger();

/** `fetch` that runs the real route logic of ./server (the SSE goes through the real encoder and reader). */
function routesFetch(client: Anthropic, log: string[] = []) {
  const context: RenderContext = { caller, config, ledger, now: NOW, client };
  return vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const body = JSON.parse(String(init.body)) as unknown;
    if (init.signal?.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
    if (url === RENDER_SESSION_ENDPOINT) return renderJsonResponse(await openRenderSession(body as RenderSessionBody, context), caller);
    if (url === RENDER_BLOCK_ENDPOINT) return renderJsonResponse(await renderBlock(body as RenderBlockBody, context), caller);
    if (url !== RENDER_ENDPOINT) return new Response("not found", { status: 404 });
    const request = body as RenderRequestBody;
    if (request.task === "direction") return renderJsonResponse(await renderDirection(request, context), caller);
    log.push(`request ${request.screen.id === "s-two" ? "two" : "one"}`);
    const result = await renderScreen(request, context);
    if (!result.ok) return renderJsonResponse(result, caller);
    // Cut the response when the client aborts, like the browser does (the server's stream keeps running).
    const reader = result.body.getReader();
    const cut = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (init.signal?.aborted) {
          controller.error(Object.assign(new Error("aborted"), { name: "AbortError" }));
          return;
        }
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      },
    });
    return renderStreamResponse(cut, caller);
  });
}

beforeEach(() => {
  resetAiLedger();
  ledger = memoryAiLedger();
  resetScreenGates();
});
afterEach(() => vi.unstubAllGlobals());

describe("free transport ↔ /api/ai/render/* (the real route logic)", () => {
  it("session → direction → 2 screens → block action, with the session counters", async () => {
    const log: string[] = [];
    const { client } = slowClient(HTML, log);
    vi.stubGlobal("fetch", routesFetch(client, log));
    const free = freeTransport("claude-haiku-5-5");
    expect(free).toMatchObject({ path: "free", model: "claude-haiku-5-5", cancelStopsBilling: false });

    const session = await free.openSession({ screens: 2 });
    expect(session.session).toMatchObject({ screensMax: 2, actionsMax: 10 });
    expect(session.freeUsesRemaining).toBe(4);

    const direction = await free.direction({ sessionId: session.sessionId, brand: BRAND, locale: "es", seed: 1, recipeId: "soft-ui", chip: "auto", screens: [] });
    expect(direction.direction.rationale).toBe("Porque sí");

    const two = screenFixture("s-two", ["b-hero", "b-cta"]);
    const [first, second] = await Promise.all([
      collect(free.screen({ sessionId: session.sessionId, brand: BRAND, direction: DIRECTION, screen })),
      collect(free.screen({ sessionId: session.sessionId, brand: BRAND, direction: DIRECTION, screen: two })),
    ]);
    for (const events of [first!, second!]) {
      expect(events[0]).toEqual({ type: "progress", received: 0 });
      expect(blocksOf(events).map((event) => event.blockId)).toEqual(["b-hero", "b-cta"]);
      expect(events.find((event) => event.type === "usage")).toMatchObject({ usage: { cacheReadTokens: 2400 } });
    }
    expect(second!.at(-1)).toMatchObject({ type: "done", session: { screensUsed: 2 } });
    // Priming: the 2nd screen reached the server only after the 1st one's response began.
    expect(log.indexOf("request two")).toBeGreaterThan(log.indexOf("message_start one"));

    const screenOnly = toScreenOnly(screen);
    const action = await free.block({ sessionId: session.sessionId, brand: BRAND, direction: DIRECTION, screen: screenOnly, block: screen.blocks[0]!, html: "<section></section>", action: { kind: "reroll", seed: 4 } });
    expect(action.session?.actionsUsed).toBe(1);
    expect(action.html).toContain("b-hero");
  });

  it("a session refused by the policy throws its code (the UI then offers the key or «mi Claude»)", async () => {
    const { client } = slowClient();
    vi.stubGlobal("fetch", routesFetch(client));
    const free = freeTransport("claude-haiku-5-5");
    for (let i = 0; i < 5; i++) await free.openSession({ screens: 1 });
    const error = await free.openSession({ screens: 1 }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RenderTransportError);
    expect(error).toMatchObject({ code: "free-tier-exhausted", status: 402 });
  });

  it("a screen past the session's 3 is an error event with the counters, never a throw", async () => {
    const { client } = slowClient();
    vi.stubGlobal("fetch", routesFetch(client));
    const free = freeTransport("claude-haiku-5-5");
    const session = await free.openSession({ screens: 1 });
    await collect(free.screen({ sessionId: session.sessionId, brand: BRAND, direction: DIRECTION, screen }));
    const events = await collect(free.screen({ sessionId: session.sessionId, brand: BRAND, direction: DIRECTION, screen }));
    expect(events).toEqual([
      { type: "error", error: expect.objectContaining({ code: "session-exhausted" }) },
      { type: "done", session: expect.objectContaining({ screensUsed: 1, screensMax: 1 }) },
    ]);
  });

  it("cancel in the free tier closes the view only: the server finishes the call and settles it (spec §5.3 [C8])", async () => {
    const { client } = slowClient(HTML.repeat(1));
    vi.stubGlobal("fetch", routesFetch(client));
    const free = freeTransport("claude-haiku-5-5");
    const session = await free.openSession({ screens: 1 });
    const controller = new AbortController();
    const events = await collect(free.screen({ sessionId: session.sessionId, brand: BRAND, direction: DIRECTION, screen }, { signal: controller.signal }), (event) => {
      if (event.type === "block") controller.abort();
    });
    expect(blocksOf(events)).toHaveLength(1);
    expect(events.at(-2)).toMatchObject({ type: "error", error: { code: "aborted" } });
    expect(events.at(-1)).toEqual({ type: "done", session: null });
    // The paid call still ran to the end and was settled at its real cost; the screen counts.
    await vi.waitFor(async () => expect((await ledger.usage({ deviceId: "device-a", ipHash: "ip-a", now: NOW })).spentUsd).toBeGreaterThan(0));
    expect((await ledger.usage({ deviceId: "device-a", ipHash: "ip-a", now: NOW })).reservedUsd).toBe(0);
  });

  it("network failures and a stream cut before `done` become a `network` error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const free = freeTransport("claude-haiku-5-5");
    expect(await collect(free.screen({ sessionId: "s", brand: BRAND, direction: DIRECTION, screen }))).toEqual([
      { type: "error", error: { code: "network", message: "Could not reach the server" } },
      { type: "done", session: null },
    ]);
    await expect(free.openSession({ screens: 1 })).rejects.toMatchObject({ code: "network" });

    const encoder = new TextEncoder();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(encoder.encode('event: block\ndata: {"type":"block","blockId":"b-hero","html":"<section></section>","forced":false}\n\n'), { headers: { "content-type": "text/event-stream" } })),
    );
    const cut = await collect(free.screen({ sessionId: "s2", brand: BRAND, direction: DIRECTION, screen }));
    expect(cut.map((event) => event.type)).toEqual(["block", "error", "done"]);
  });

  it("an answer that is neither JSON nor SSE keeps a code by status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>gateway</html>", { status: 504 })));
    await expect(freeTransport("claude-haiku-5-5").direction({ sessionId: "s", brand: BRAND, locale: "es", seed: 1, recipeId: "soft-ui", chip: "auto", screens: [] })).rejects.toMatchObject({
      code: "upstream-error",
      status: 504,
    });
  });
});

describe("choosing a path", () => {
  const status = (patch: Partial<AiStatusResponse>): AiStatusResponse => ({ ...OFFLINE_AI_STATUS, configured: true, freeUsesRemaining: 3, remainingBudgetUsd: 4, freeModel: "claude-haiku-5-5", ...patch });

  it("the key wins, then the free tier, then the way out with its reason", () => {
    expect(renderPathFor(status({}), true)).toEqual({ path: "byok", reason: null });
    expect(renderPathFor(status({}), false)).toEqual({ path: "free", reason: null });
    expect(renderPathFor(status({ freeUsesRemaining: 0 }), false)).toEqual({ path: null, reason: "free-tier-exhausted" });
    expect(renderPathFor(status({ remainingBudgetUsd: 0 }), false)).toEqual({ path: null, reason: "budget-exceeded" });
    expect(renderPathFor(null, false)).toEqual({ path: null, reason: "not-configured" });
  });

  it("free uses the status' free model; BYOK defaults to Opus 5.5", () => {
    expect(createRenderTransport("free", { status: status({}) }).model).toBe("claude-haiku-5-5");
    expect(createRenderTransport("byok", { status: null }).model).toBe("claude-opus-5-5");
    // The free tier makes the mockup whatever tier was asked; the key runs the tier the user picked.
    expect(createRenderTransport("free", { status: status({}), tier: "final" }).tier).toBe("mockup");
    expect(createRenderTransport("byok", { status: null, tier: "presentable" }).tier).toBe("presentable");
    expect(createRenderTransport("byok", { status: null }).tier).toBe("mockup");
    expect(createRenderTransport("byok", { status: null, byokModel: "claude-sonnet-5-5" }).model).toBe("claude-sonnet-5-5");
  });
});
