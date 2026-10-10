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

// ── «Diseño con IA»: design sessions (docs/design/diseno-con-ia-spec.md §5.2, user decision 2) ──────────────
// One free use opens a session: 1 «Generar con IA» of up to `screens` screens (plus its art direction) and up to
// `actions` block actions (Otra versión / Pedir cambio) for `ttl`. Each paid call inside it reserves its own worst
// case against the global budget WITHOUT another free use or IP request, and is settled like any other call.

export const AI_SESSION_KINDS = ["direction", "screen", "action"] as const;
export type AiSessionKind = (typeof AI_SESSION_KINDS)[number];

export type AiSessionCounters = {
  directionsUsed: number;
  directionsMax: number;
  screensUsed: number;
  screensMax: number;
  actionsUsed: number;
  actionsMax: number;
  /** ISO time. */
  expiresAt: string;
};

export type AiSessionOpenRequest = AiLedgerKey &
  AiLedgerLimits & {
    model: string;
    /** Worst case of the session's generate (direction + screens): it must fit the budget now. Not reserved. */
    amountUsd: number;
    ttlSeconds: number;
    directions: number;
    screens: number;
    actions: number;
  };

export type AiSessionOpenOutcome =
  | { ok: true; sessionId: string; session: AiSessionCounters; usage: AiLedgerUsage }
  | { ok: false; reason: AiLimitReason; usage: AiLedgerUsage };

export type AiSessionRefusal = "not-found" | "expired" | "directions-exhausted" | "screens-exhausted" | "actions-exhausted";

export type AiSessionReserveRequest = {
  sessionId: string;
  deviceId: string;
  kind: AiSessionKind;
  model: string;
  amountUsd: number;
  monthlyBudgetUsd: number;
  now?: Date;
};

export type AiSessionReserveOutcome =
  | { ok: true; reservationId: string; session: AiSessionCounters; usage: AiLedgerUsage }
  | { ok: false; reason: AiSessionRefusal | "budget-exceeded"; session?: AiSessionCounters; usage?: AiLedgerUsage };

export type AiSessionPeekRequest = Omit<AiSessionReserveRequest, "model" | "amountUsd">;
export type AiSessionPeekOutcome =
  | { ok: true; session: AiSessionCounters }
  | { ok: false; reason: AiSessionRefusal | "budget-exceeded"; session?: AiSessionCounters; usage?: AiLedgerUsage };

export interface AiSessionLedger {
  /** Atomic: the device's free uses, the IP's daily limit and the budget, then one free use, one IP request and the session. */
  openSession(request: AiSessionOpenRequest): Promise<AiSessionOpenOutcome>;
  /** Atomic: counts one `kind` of the session (same device, not expired, under its max) and reserves `amountUsd`. */
  reserveInSession(request: AiSessionReserveRequest): Promise<AiSessionReserveOutcome>;
  /**
   * Read only, before any upstream work (count_tokens): the session exists for this device, is live, has a `kind`
   * left and the month's budget is not already spent. `reserveInSession` checks all of it again, atomically.
   */
  peekSession(request: AiSessionPeekRequest): Promise<AiSessionPeekOutcome>;
  /**
   * A screen or action that FAILED (API error, refusal, 0 valid blocks) gives its slot back: the retry is free. At
   * most `<kind>Max` refunds per kind and session, so a billed failure cannot be repeated without end (a session
   * makes at most twice its slots of paid calls). Past the cap it changes nothing and returns the counters.
   */
  refundSession(sessionId: string, deviceId: string, kind: AiSessionKind, now?: Date): Promise<AiSessionCounters | null>;
}

export interface AiLedger {
  readonly kind: "supabase" | "memory";
  /** «Diseño con IA» sessions. Absent: the render routes answer 503. */
  readonly sessions?: AiSessionLedger;
  usage(key: AiLedgerKey): Promise<AiLedgerUsage>;
  /**
   * Atomic: checks the free uses, the IP's daily requests and the budget, then reserves `amountUsd`,
   * takes one free use and one IP request.
   */
  reserve(request: AiReserveRequest): Promise<AiReserveOutcome>;
  /** The call was billed: charges `costUsd` and frees the rest of the reservation. Idempotent. */
  settle(reservationId: string, costUsd: number, now?: Date): Promise<AiLedgerUsage | null>;
  /** The call was not billed: frees the reservation and gives the free use back (not inside a session). Idempotent. */
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
