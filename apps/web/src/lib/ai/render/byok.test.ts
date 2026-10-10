import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RenderStreamEvent } from "./api";
import { BRAND, DIRECTION, anthropicFrames, anthropicMessage, blocksOf, collect, recordingFetch, screenFixture, sseResponse, streamBody, type RecordedRequest, screenOnly as toScreenOnly } from "./testing";
import { byokTransport, resetScreenGates, RenderTransportError } from "./transport";

const KEY = "sk-ant-api03-test-0000000000000000000000";
const HTML = 'Here you go:\n```html\n<section data-block-id="b-hero" class="@container py-section"><h1 class="text-h1">Hola</h1></section>\n<section data-block-id="b-cta"><p>Empieza</p></section>\n```';
const chunks = (text: string, size = 9) => text.match(new RegExp(`[\\s\\S]{1,${size}}`, "g")) ?? [];

const screen = screenFixture("s-home", ["b-hero", "b-cta"]);
const transport = (model = "claude-opus-5-5") => byokTransport({ getKey: () => KEY, model });

function anthropicApi(options: { text?: string; holdAfter?: number; stopReason?: string; chunkSize?: number } = {}) {
  return recordingFetch((request) => {
    const body = JSON.parse(request.body) as { stream?: boolean; model: string };
    if (!body.stream) {
      return Response.json(anthropicMessage(JSON.stringify({ axes: DIRECTION.axes, moves: DIRECTION.moves, rationale: "Porque sí" }), body.model));
    }
    const frames = anthropicFrames(chunks(options.text ?? HTML, options.chunkSize), { model: body.model, ...(options.stopReason && { stopReason: options.stopReason }) });
    return sseResponse(streamBody(frames, { signal: request.signal, ...(options.holdAfter !== undefined && { holdAfter: options.holdAfter }) }));
  });
}

beforeEach(() => resetScreenGates());
afterEach(() => vi.unstubAllGlobals());

/** Spec §6.4 / tracks C: the key never reaches the Dialmade server. */
function expectOnlyAnthropic(requests: readonly RecordedRequest[]) {
  expect(requests.length).toBeGreaterThan(0);
  for (const request of requests) {
    const url = new URL(request.url);
    expect(url.origin).toBe("https://api.anthropic.com");
    expect(url.pathname).toBe("/v1/messages");
    expect(request.headers.get("x-api-key")).toBe(KEY);
    // Browser access is explicit (and the only reason the SDK accepts to run in a page).
    expect(request.headers.get("anthropic-dangerous-direct-browser-access")).toBe("true");
    // The key travels in its header only, never inside a body.
    expect(request.body).not.toContain(KEY);
    expect(request.headers.get("authorization")).toBeNull();
  }
}

describe("BYOK transport: network", () => {
  it("a whole generate (session, direction, screen, block action) talks only to api.anthropic.com", async () => {
    const api = anthropicApi();
    vi.stubGlobal("fetch", api.fetch);
    const byok = transport();
    const session = await byok.openSession({ screens: 1 });
    // A BYOK session is local: no request at all.
    expect(api.requests).toHaveLength(0);
    expect(session.session).toBeNull();

    const direction = await byok.direction({ sessionId: session.sessionId, brand: BRAND, locale: "es", seed: 1, recipeId: "soft-ui", chip: "auto", screens: [] });
    expect(direction.direction.rationale).toBe("Porque sí");
    expect(direction.session).toBeNull();

    const events = await collect(byok.screen({ sessionId: session.sessionId, brand: BRAND, direction: DIRECTION, screen }));
    expect(blocksOf(events).map((event) => event.blockId)).toEqual(["b-hero", "b-cta"]);
    expect(events[0]).toEqual({ type: "progress", received: 0 });
    expect(events.at(-1)).toEqual({ type: "done", session: null });
    const usage = events.find((event) => event.type === "usage") as Extract<RenderStreamEvent, { type: "usage" }>;
    expect(usage.usage).toMatchObject({ model: "claude-opus-5-5", cacheReadTokens: 2400, outputTokens: 1200 });
    expect(usage.usage.costUsd).toBeGreaterThan(0);

    const screenOnly = toScreenOnly(screen);
    const action = await byok.block({ sessionId: session.sessionId, brand: BRAND, direction: DIRECTION, screen: screenOnly, block: screen.blocks[1]!, html: "<section></section>", action: { kind: "change", request: "Más aire" } });
    expect(action.html).toContain('data-block-id="b-cta"');

    expect(api.requests).toHaveLength(3);
    expectOnlyAnthropic(api.requests);
    // Opus 5.5 is the default model; the prompt is the same contract the hosted route sends.
    for (const request of api.requests) expect(JSON.parse(request.body)).toMatchObject({ model: "claude-opus-5-5" });
  });

  it("Sonnet 5.5 when the user picks it", async () => {
    const api = anthropicApi();
    vi.stubGlobal("fetch", api.fetch);
    await collect(transport("claude-sonnet-5-5").screen({ sessionId: "s1", brand: BRAND, direction: DIRECTION, screen }));
    expect(JSON.parse(api.requests[0]!.body)).toMatchObject({ model: "claude-sonnet-5-5" });
    expectOnlyAnthropic(api.requests);
  });

  it("without a key nothing is sent", async () => {
    const api = anthropicApi();
    vi.stubGlobal("fetch", api.fetch);
    const byok = byokTransport({ getKey: () => null, model: "claude-opus-5-5" });
    const events = await collect(byok.screen({ sessionId: "s1", brand: BRAND, direction: DIRECTION, screen }));
    expect(events).toEqual([{ type: "error", error: { code: "invalid-key", message: "No API key in this tab" } }, { type: "done", session: null }]);
    await expect(byok.direction({ sessionId: "s1", brand: BRAND, locale: "es", seed: 1, recipeId: "soft-ui", chip: "auto", screens: [] })).rejects.toBeInstanceOf(RenderTransportError);
    expect(api.requests).toHaveLength(0);
  });
});

describe("BYOK transport: cancel aborts for real (spec §5.3)", () => {
  it("aborting stops the HTTP request; finished blocks stay, the rest never arrive", async () => {
    // The stream sends the first root, then hangs until the request is aborted.
    const firstRootFrames = 2 + chunks(HTML).findIndex((_, i, all) => all.slice(0, i + 1).join("").includes("</section>")) + 1;
    const api = anthropicApi({ holdAfter: firstRootFrames });
    vi.stubGlobal("fetch", api.fetch);
    const controller = new AbortController();
    const events = await collect(transport().screen({ sessionId: "s1", brand: BRAND, direction: DIRECTION, screen }, { signal: controller.signal }), (event) => {
      if (event.type === "block") controller.abort();
    });
    expect(blocksOf(events).map((event) => event.blockId)).toEqual(["b-hero"]);
    expect(events.at(-2)).toMatchObject({ type: "error", error: { code: "aborted" } });
    expect(events.at(-1)).toEqual({ type: "done", session: null });
    expect(api.requests[0]!.signal?.aborted).toBe(true);
  });

  it("leaving the loop early aborts too", async () => {
    const api = anthropicApi({ holdAfter: 4 });
    vi.stubGlobal("fetch", api.fetch);
    for await (const event of transport().screen({ sessionId: "s1", brand: BRAND, direction: DIRECTION, screen })) {
      if (event.type === "progress") break;
    }
    await vi.waitFor(() => expect(api.requests[0]!.signal?.aborted).toBe(true));
  });

  it("a block action is aborted by its signal", async () => {
    const api = anthropicApi({ holdAfter: 3 });
    vi.stubGlobal("fetch", api.fetch);
    const controller = new AbortController();
    const screenOnly = toScreenOnly(screen);
    const pending = transport().block({ sessionId: "s1", brand: BRAND, direction: DIRECTION, screen: screenOnly, block: screen.blocks[0]!, html: "", action: { kind: "reroll", seed: 2 } }, { signal: controller.signal });
    await vi.waitFor(() => expect(api.requests).toHaveLength(1));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "aborted" });
  });
});

describe("BYOK transport: malformed answers", () => {
  it("prose and fences around the roots are ignored; an unclosed root at the end is handed over as forced", async () => {
    const api = anthropicApi({ text: 'Claro:\n<section data-block-id="b-hero"><h1>Hola</h1></section>\n<section data-block-id="b-cta"><p>Sin cerrar', stopReason: "max_tokens" });
    vi.stubGlobal("fetch", api.fetch);
    const events = await collect(transport().screen({ sessionId: "s1", brand: BRAND, direction: DIRECTION, screen }));
    expect(blocksOf(events).map((event) => [event.blockId, event.forced])).toEqual([
      ["b-hero", false],
      ["b-cta", true],
    ]);
    expect(events.some((event) => event.type === "error")).toBe(false);
  });

  it("an answer without any root of the screen is an error (the store keeps the base design)", async () => {
    const api = anthropicApi({ text: "<div data-block-id=\"b-other\">x</div> I can't help with that." });
    vi.stubGlobal("fetch", api.fetch);
    const events = await collect(transport().screen({ sessionId: "s1", brand: BRAND, direction: DIRECTION, screen }));
    expect(events.at(-2)).toMatchObject({ type: "error", error: { code: "invalid-response" } });
  });

  it("a refusal with no block is `refused`", async () => {
    const api = anthropicApi({ text: "No.", stopReason: "refusal" });
    vi.stubGlobal("fetch", api.fetch);
    const events = await collect(transport().screen({ sessionId: "s1", brand: BRAND, direction: DIRECTION, screen }));
    expect(events.at(-2)).toMatchObject({ type: "error", error: { code: "refused" } });
  });

  it("an answer over 120 KB is cut", async () => {
    const huge = `<section data-block-id="b-hero">${"<p>x</p>".repeat(16_000)}</section>`;
    const api = anthropicApi({ text: huge, chunkSize: 4096 });
    vi.stubGlobal("fetch", api.fetch);
    const events = await collect(transport().screen({ sessionId: "s1", brand: BRAND, direction: DIRECTION, screen }));
    expect(events.at(-2)).toMatchObject({ type: "error", error: { code: "invalid-response" } });
    expect(api.requests[0]!.signal?.aborted).toBe(true);
  });

  it("a rejected key and an overloaded API map to the wire codes", async () => {
    vi.stubGlobal("fetch", recordingFetch(() => Response.json({ type: "error", error: { type: "authentication_error", message: "bad key" } }, { status: 401 })).fetch);
    const events = await collect(transport().screen({ sessionId: "s1", brand: BRAND, direction: DIRECTION, screen }));
    expect(events.at(-2)).toMatchObject({ type: "error", error: { code: "invalid-key" } });
    vi.stubGlobal("fetch", recordingFetch(() => Response.json({ type: "error", error: { type: "overloaded_error", message: "busy" } }, { status: 529 })).fetch);
    await expect(transport().direction({ sessionId: "s1", brand: BRAND, locale: "es", seed: 1, recipeId: "soft-ui", chip: "auto", screens: [] })).rejects.toMatchObject({ code: "overloaded" });
  });
});

describe("cache priming (spec §3.3)", () => {
  it("the 2nd screen of a session starts after the 1st one's response began, so it reads the cached prefix", async () => {
    const started: string[] = [];
    const api = recordingFetch((request) => {
      const body = JSON.parse(request.body) as { messages: { content: { text: string }[] }[] };
      const id = body.messages[0]!.content[1]!.text.includes('"s-two"') ? "two" : "one";
      started.push(`request ${id}`);
      return sseResponse(streamBody(anthropicFrames(chunks(HTML)), { onFrame: (index) => index === 0 && started.push(`message_start ${id}`) }));
    });
    vi.stubGlobal("fetch", api.fetch);
    const byok = transport();
    const second = screenFixture("s-two", ["b-hero", "b-cta"]);
    await Promise.all([
      collect(byok.screen({ sessionId: "same", brand: BRAND, direction: DIRECTION, screen })),
      collect(byok.screen({ sessionId: "same", brand: BRAND, direction: DIRECTION, screen: second })),
    ]);
    expect(started.indexOf("request two")).toBeGreaterThan(started.indexOf("message_start one"));
    // Same cached prefix, byte for byte: the contract (breakpoint 1) and the art direction (breakpoint 2).
    const [one, two] = api.requests.map((request) => JSON.parse(request.body) as { system: unknown; messages: { content: { text: string; cache_control?: unknown }[] }[] });
    expect(two!.system).toEqual(one!.system);
    expect(two!.messages[0]!.content[0]).toEqual(one!.messages[0]!.content[0]);
    expect(one!.messages[0]!.content[0]!.cache_control).toEqual({ type: "ephemeral" });
  });
});
