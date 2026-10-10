// Server only. The hosted AI ledger: global monthly spend, free uses per device per month and requests
// per IP per day, with worst-case reservations. Two implementations with the same rules, chosen by
// ./getAiLedger:
// - Supabase (./ledgerSupabase, supabase/migrations/*_ai_ledger.sql): persistent and atomic; required
//   in production;
// - memory (./budget): one process only; outside production without Supabase, and in tests.

export type AiLedgerKey = {
  deviceId: string;
  ipHash: string;
  /** Clock of the memory ledger (tests). The Supabase ledger uses the database clock. */
  now?: Date;
};

export type AiLedgerLimits = {
  monthlyBudgetUsd: number;
  freeUsesPerMonth: number;
  maxRequestsPerIpPerDay: number;
};

/** Counters of the current UTC month (and day, for the IP). */
export type AiLedgerUsage = {
  month: string;
  spentUsd: number;
  reservedUsd: number;
  freeUsesUsed: number;
  ipRequestsToday: number;
};

export type AiLimitReason = "free-tier-exhausted" | "daily-limit" | "budget-exceeded";

export type AiReserveRequest = AiLedgerKey & AiLedgerLimits & { model: string; amountUsd: number };

export type AiReserveOutcome =
  | { ok: true; reservationId: string; usage: AiLedgerUsage }
  | { ok: false; reason: AiLimitReason; usage: AiLedgerUsage };

export interface AiLedger {
  readonly kind: "supabase" | "memory";
  usage(key: AiLedgerKey): Promise<AiLedgerUsage>;
  /**
   * Atomic: checks the free uses, the IP's daily requests and the budget, then reserves `amountUsd`,
   * takes one free use and one IP request.
   */
  reserve(request: AiReserveRequest): Promise<AiReserveOutcome>;
  /** The call was billed: charges `costUsd` and frees the rest of the reservation. Idempotent. */
  settle(reservationId: string, costUsd: number, now?: Date): Promise<AiLedgerUsage | null>;
  /** The call was not billed: frees the reservation and gives the free use back. Idempotent. */
  release(reservationId: string, now?: Date): Promise<AiLedgerUsage | null>;
}

/** Thrown by a ledger that cannot be reached or answers something unexpected. */
export class AiLedgerError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiLedgerError";
  }
}

export const remainingUsd = (usage: AiLedgerUsage, monthlyBudgetUsd: number): number =>
  Math.max(0, monthlyBudgetUsd - usage.spentUsd - usage.reservedUsd);

export const freeUsesLeft = (usage: AiLedgerUsage, freeUsesPerMonth: number): number => Math.max(0, freeUsesPerMonth - usage.freeUsesUsed);

/** Same order as the SQL: the device's free uses, then the IP's daily limit, then the global budget. */
export function limitReason(usage: AiLedgerUsage, limits: AiLedgerLimits, amountUsd = 0): AiLimitReason | null {
  if (usage.freeUsesUsed >= limits.freeUsesPerMonth) return "free-tier-exhausted";
  if (usage.ipRequestsToday >= limits.maxRequestsPerIpPerDay) return "daily-limit";
  const left = limits.monthlyBudgetUsd - usage.spentUsd - usage.reservedUsd;
  if (left <= 0 || amountUsd > left) return "budget-exceeded";
  return null;
}
