import { describe, expect, it, vi } from "vitest";
import { BRAND, DIRECTION, screenFixture } from "../testing";
import { RenderTransportError, type RenderTransport as AccessTransport } from "../transport";
import { manualTransport } from "../manual";
import { fromAccessTransport } from "./accessTransport";
import { blockTransportFrom, BlockActionError } from "../blockAction";

const COUNTERS = { directionsUsed: 0, directionsMax: 2, screensUsed: 1, screensMax: 3, actionsUsed: 0, actionsMax: 10, expiresAt: "2026-10-11T00:00:00.000Z" };

function fakeAccess(overrides: Partial<AccessTransport> = {}): AccessTransport {
  return {
    path: "free",
    model: "claude-haiku-5-5",
    tier: "mockup",
    cancelStopsBilling: false,
    openSession: vi.fn(async () => ({ sessionId: "s-1", session: COUNTERS })),
    direction: vi.fn(async () => ({ direction: DIRECTION, usage: null, session: null })),
    block: vi.fn(async () => ({ html: "<div></div>", usage: null, session: null })),
    async *screen() {
      yield { type: "done" as const, session: null };
    },
    ...overrides,
  };
}

describe("fromAccessTransport (Track C's transport as the generation's)", () => {
  it("keeps the path and model, and strips `task` from the wire bodies", async () => {
    const access = fakeAccess();
    const transport = fromAccessTransport(access);
    expect(transport).toMatchObject({ path: "free", model: "claude-haiku-5-5", cancelStopsBilling: false });
    const body = { task: "direction" as const, sessionId: "s-1", brand: BRAND, locale: "es" as const, seed: 1, recipeId: "soft-ui", chip: "auto" as const, screens: [] };
    const answer = await transport.direction(body);
    expect(answer).toEqual({ ok: true, value: { direction: DIRECTION, usage: null, session: null } });
    expect(access.direction).toHaveBeenCalledWith(expect.not.objectContaining({ task: expect.anything() }), {});
  });

  it("never throws: a RenderTransportError comes back as its body, an abort as `aborted`", async () => {
    const failing = fakeAccess({
      openSession: vi.fn(async () => {
        throw new RenderTransportError({ code: "free-tier-exhausted", message: "x", session: COUNTERS });
      }),
      block: vi.fn(async () => {
        throw new DOMException("Aborted", "AbortError");
      }),
    });
    const transport = fromAccessTransport(failing);
    expect(await transport.openSession({ screens: 1 })).toEqual({ ok: false, error: { code: "free-tier-exhausted", message: "x", session: COUNTERS } });
    const block = await transport.block({} as never);
    expect(block.ok).toBe(false);
    expect(!block.ok && block.error.code).toBe("aborted");
  });

  it("«mi Claude»: the pasted roots stream as blocks of the requested screen", async () => {
    const screen = screenFixture("s-home", ["b-1"]);
    const transport = fromAccessTransport(
      manualTransport({ direction: DIRECTION, answer: { screens: { "s-home": [{ blockId: "b-1", html: '<section data-block-id="b-1"></section>', forced: false }] } } }),
    );
    expect(transport.model).toBe("claude.ai");
    const events = [];
    for await (const event of transport.screen({ task: "screen", sessionId: "local", brand: BRAND, direction: DIRECTION, screen }, new AbortController().signal)) events.push(event.type);
    expect(events).toEqual(["progress", "block", "done"]);
  });
});

describe("blockTransportFrom (Track B's block actions over Track C's transport)", () => {
  it("only the free tier spends a session; errors become BlockActionError with the session's counters", async () => {
    expect(blockTransportFrom(fakeAccess()).usesSession).toBe(true);
    expect(blockTransportFrom(fakeAccess({ path: "byok", model: "claude-opus-5-5" }))).toMatchObject({ usesSession: false, path: "byok", model: "claude-opus-5-5" });
    const failing = blockTransportFrom(
      fakeAccess({
        block: vi.fn(async () => {
          throw new RenderTransportError({ code: "session-exhausted", message: "x", session: COUNTERS });
        }),
      }),
    );
    const error = await failing.run({} as never).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BlockActionError);
    expect(error).toMatchObject({ code: "session-exhausted", session: COUNTERS });
  });
});
