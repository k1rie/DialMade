import { beforeEach, describe, expect, it } from "vitest";
import { memoryAiLedger, resetAiLedger } from "./budget";
import { limitReason, type AiReserveRequest } from "./ledger";

const OCT = new Date("2026-10-09T12:00:00Z");
const NOV = new Date("2026-11-01T00:00:01Z");
const limits = { monthlyBudgetUsd: 5, freeUsesPerMonth: 5, maxRequestsPerIpPerDay: 10 };
const request = (overrides: Partial<AiReserveRequest> = {}): AiReserveRequest => ({
  deviceId: "device-a",
  ipHash: "ip-a",
  model: "claude-haiku-5-5",
  amountUsd: 0.4,
  now: OCT,
  ...limits,
  ...overrides,
});

describe("memory ledger (same rules as the SQL one)", () => {
  beforeEach(() => resetAiLedger());

  it("reserves the worst case and one free use, then settles the real cost", async () => {
    const ledger = memoryAiLedger();
    const reserved = await ledger.reserve(request());
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) return;
    expect(reserved.usage).toMatchObject({ month: "2026-10", spentUsd: 0, reservedUsd: 0.4, freeUsesUsed: 1, ipRequestsToday: 1 });

    const settled = await ledger.settle(reserved.reservationId, 0.05, OCT);
    expect(settled).toMatchObject({ spentUsd: 0.05, reservedUsd: 0, freeUsesUsed: 1 });
    expect(await ledger.settle(reserved.reservationId, 1, OCT)).toMatchObject({ spentUsd: 0.05 });
  });

  it("refuses a reservation that does not fit, also across concurrent requests", async () => {
    const ledger = memoryAiLedger();
    const first = await ledger.reserve(request({ amountUsd: 3 }));
    expect(first.ok).toBe(true);
    const second = await ledger.reserve(request({ deviceId: "device-b", amountUsd: 2.5 }));
    expect(second).toMatchObject({ ok: false, reason: "budget-exceeded" });
    if (first.ok) await ledger.release(first.reservationId, OCT);
    expect((await ledger.reserve(request({ deviceId: "device-b", amountUsd: 2.5 }))).ok).toBe(true);
  });

  it("gives each device its free uses per month and answers free-tier-exhausted after them", async () => {
    const ledger = memoryAiLedger();
    for (let i = 0; i < 5; i++) expect((await ledger.reserve(request({ amountUsd: 0.01, ipHash: `ip-${i}` }))).ok).toBe(true);
    expect(await ledger.reserve(request({ amountUsd: 0.01, ipHash: "ip-9" }))).toMatchObject({ ok: false, reason: "free-tier-exhausted" });
    expect((await ledger.reserve(request({ deviceId: "device-b", amountUsd: 0.01 }))).ok).toBe(true);
    expect((await ledger.reserve(request({ amountUsd: 0.01, now: NOV }))).ok).toBe(true);
  });

  it("limits requests per IP per UTC day, whatever the device", async () => {
    const ledger = memoryAiLedger();
    const tight = { maxRequestsPerIpPerDay: 2, amountUsd: 0.01 };
    expect((await ledger.reserve(request({ ...tight, deviceId: "d1" }))).ok).toBe(true);
    expect((await ledger.reserve(request({ ...tight, deviceId: "d2" }))).ok).toBe(true);
    expect(await ledger.reserve(request({ ...tight, deviceId: "d3" }))).toMatchObject({ ok: false, reason: "daily-limit" });
    expect((await ledger.reserve(request({ ...tight, deviceId: "d3", now: new Date("2026-10-10T00:00:01Z") }))).ok).toBe(true);
  });

  it("release gives the free use back but keeps the IP request counted", async () => {
    const ledger = memoryAiLedger();
    const reserved = await ledger.reserve(request());
    if (!reserved.ok) throw new Error("expected a reservation");
    expect(await ledger.release(reserved.reservationId, OCT)).toMatchObject({ reservedUsd: 0, spentUsd: 0, freeUsesUsed: 0, ipRequestsToday: 1 });
    expect(await ledger.release(reserved.reservationId, OCT)).toMatchObject({ freeUsesUsed: 0 });
  });

  it("charges an unanswered reservation in full after the TTL, and a late settle corrects it", async () => {
    const ledger = memoryAiLedger();
    const stale = await ledger.reserve(request({ amountUsd: 1 }));
    if (!stale.ok) throw new Error("expected a reservation");
    await ledger.reserve(request({ deviceId: "device-b", amountUsd: 0.1, now: new Date(OCT.getTime() + 11 * 60_000) }));
    expect(await ledger.usage({ deviceId: "device-a", ipHash: "ip-a", now: OCT })).toMatchObject({ spentUsd: 1, reservedUsd: 0.1 });
    expect(await ledger.settle(stale.reservationId, 0.2, OCT)).toMatchObject({ spentUsd: 0.2 });
  });

  it("starts every UTC month from zero", async () => {
    const ledger = memoryAiLedger();
    const reserved = await ledger.reserve(request({ amountUsd: 4 }));
    if (reserved.ok) await ledger.settle(reserved.reservationId, 4, OCT);
    expect(await ledger.usage({ deviceId: "device-a", ipHash: "ip-a", now: OCT })).toMatchObject({ spentUsd: 4, freeUsesUsed: 1 });
    expect(await ledger.usage({ deviceId: "device-a", ipHash: "ip-a", now: NOV })).toMatchObject({ spentUsd: 0, freeUsesUsed: 0 });
  });
});

describe("limitReason", () => {
  const usage = { month: "2026-10", spentUsd: 1, reservedUsd: 0, freeUsesUsed: 0, ipRequestsToday: 0 };
  it("checks the free uses, then the IP, then the budget", () => {
    expect(limitReason({ ...usage, freeUsesUsed: 5, ipRequestsToday: 10, spentUsd: 5 }, limits)).toBe("free-tier-exhausted");
    expect(limitReason({ ...usage, ipRequestsToday: 10, spentUsd: 5 }, limits)).toBe("daily-limit");
    expect(limitReason({ ...usage, spentUsd: 5 }, limits)).toBe("budget-exceeded");
    expect(limitReason(usage, limits, 4.5)).toBe("budget-exceeded");
    expect(limitReason(usage, limits, 4)).toBeNull();
  });
});
