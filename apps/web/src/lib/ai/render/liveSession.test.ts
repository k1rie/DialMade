import { afterEach, describe, expect, it } from "vitest";
import type { RenderSessionCounters } from "./api";
import { actionsLeft, getLiveSession, liveSessionStore, setLiveSession, updateLiveSessionCounters } from "./liveSession";

const counters = (actionsUsed: number, expiresAt = "2999-01-01T00:00:00.000Z"): RenderSessionCounters => ({
  directionsUsed: 1,
  directionsMax: 2,
  screensUsed: 3,
  screensMax: 3,
  actionsUsed,
  actionsMax: 10,
  expiresAt,
});

describe("the live design session", () => {
  afterEach(() => setLiveSession(null));

  it("is published by whoever opens it and read by the block actions", () => {
    expect(getLiveSession()).toBeNull();
    setLiveSession({ sessionId: "s-1", counters: counters(2) });
    expect(getLiveSession()?.sessionId).toBe("s-1");
    expect(actionsLeft(getLiveSession()!.counters)).toBe(8);
  });

  it("takes the counters every answer carries, only for its own session", () => {
    setLiveSession({ sessionId: "s-1", counters: counters(2) });
    updateLiveSessionCounters("s-1", counters(3));
    updateLiveSessionCounters("s-other", counters(9));
    expect(getLiveSession()?.counters.actionsUsed).toBe(3);
    expect(actionsLeft(counters(12))).toBe(0);
  });

  it("an expired session is no session (24 h)", () => {
    setLiveSession({ sessionId: "s-1", counters: counters(0, "2026-10-10T12:00:00.000Z") });
    expect(liveSessionStore.getState().session).not.toBeNull();
    expect(getLiveSession(Date.parse("2026-10-10T12:00:01.000Z"))).toBeNull();
    expect(getLiveSession(Date.parse("2026-10-10T11:59:00.000Z"))?.sessionId).toBe("s-1");
  });
});
