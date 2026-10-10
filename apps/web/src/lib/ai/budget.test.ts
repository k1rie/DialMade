import { beforeEach, describe, expect, it } from "vitest";
import { remainingBudgetUsd, requestsLeftToday, reserveBudget, resetAiLedger, takeDailyRequest } from "./budget";

const OCT = new Date("2026-10-09T12:00:00Z");
const NOV = new Date("2026-11-01T00:00:01Z");

describe("budget ledger", () => {
  beforeEach(() => resetAiLedger());

  it("reserves the worst case, then settles the real cost", () => {
    const reservation = reserveBudget(0.4, 5, OCT);
    expect(reservation).not.toBeNull();
    expect(remainingBudgetUsd(5, OCT)).toBeCloseTo(4.6);
    reservation!.settle(0.05);
    expect(remainingBudgetUsd(5, OCT)).toBeCloseTo(4.95);
    reservation!.settle(1);
    expect(remainingBudgetUsd(5, OCT)).toBeCloseTo(4.95);
  });

  it("refuses a reservation that does not fit, also across concurrent requests", () => {
    const first = reserveBudget(3, 5, OCT);
    expect(first).not.toBeNull();
    expect(reserveBudget(2.5, 5, OCT)).toBeNull();
    first!.release();
    expect(reserveBudget(2.5, 5, OCT)).not.toBeNull();
  });

  it("starts every UTC month from zero", () => {
    reserveBudget(4, 5, OCT)!.settle(4);
    expect(remainingBudgetUsd(5, OCT)).toBeCloseTo(1);
    expect(remainingBudgetUsd(5, NOV)).toBeCloseTo(5);
  });

  it("limits requests per IP per UTC day", () => {
    expect(takeDailyRequest("1.2.3.4", 2, OCT)).toBe(true);
    expect(takeDailyRequest("1.2.3.4", 2, OCT)).toBe(true);
    expect(takeDailyRequest("1.2.3.4", 2, OCT)).toBe(false);
    expect(takeDailyRequest("5.6.7.8", 2, OCT)).toBe(true);
    expect(requestsLeftToday("1.2.3.4", 2, OCT)).toBe(0);
    expect(takeDailyRequest("1.2.3.4", 2, new Date("2026-10-10T00:00:01Z"))).toBe(true);
  });
});
