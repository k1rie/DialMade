// Server only. Hard monthly budget and per-IP daily limit, kept IN THE MEMORY OF THE PROCESS.
//
// That is enough for one long-lived Node server (and `next dev`), but not for production on
// serverless: every instance has its own counters and a cold start resets them, so ./server keeps the
// hosted AI off when it detects a serverless platform (fails closed). To enable it there, persist
// the ledger (e.g. a Supabase table `ai_budget(month text primary key, spent_usd numeric)` updated with
// an atomic `update … set spent_usd = spent_usd + $1 where month = $2 and spent_usd + $1 <= $3`, and
// `ai_requests(day, ip_hash, count)` for the IP limit) and keep these functions as its interface.

type Ledger = {
  month: string;
  spentUsd: number;
  reservedUsd: number;
  day: string;
  requestsByIp: Map<string, number>;
};

const LEDGER_KEY = Symbol.for("dialmade.ai.ledger");
type LedgerHost = typeof globalThis & { [LEDGER_KEY]?: Ledger };

const monthOf = (now: Date) => now.toISOString().slice(0, 7);
const dayOf = (now: Date) => now.toISOString().slice(0, 10);

/** One ledger per process (on globalThis so dev hot reloads keep it). Rolls over by UTC month/day. */
function ledger(now: Date): Ledger {
  const host = globalThis as LedgerHost;
  const current = (host[LEDGER_KEY] ??= {
    month: monthOf(now),
    spentUsd: 0,
    reservedUsd: 0,
    day: dayOf(now),
    requestsByIp: new Map(),
  });
  if (current.month !== monthOf(now)) {
    current.month = monthOf(now);
    current.spentUsd = 0;
    current.reservedUsd = 0;
  }
  if (current.day !== dayOf(now)) {
    current.day = dayOf(now);
    current.requestsByIp.clear();
  }
  return current;
}

/** Budget left this month: limit − spent − reserved by requests in flight. Never negative. */
export function remainingBudgetUsd(monthlyBudgetUsd: number, now = new Date()): number {
  const l = ledger(now);
  return Math.max(0, monthlyBudgetUsd - l.spentUsd - l.reservedUsd);
}

export type BudgetReservation = {
  readonly amountUsd: number;
  /** Records what the request really cost and frees the reservation. */
  settle: (costUsd: number) => void;
  /** Frees the reservation without spending (the request was not billed). */
  release: () => void;
};

/**
 * Reserves the worst-case cost of a request before calling the API. Returns `null` when it does not
 * fit in what is left, so concurrent requests can never overspend the month together.
 */
export function reserveBudget(amountUsd: number, monthlyBudgetUsd: number, now = new Date()): BudgetReservation | null {
  if (!(amountUsd >= 0) || amountUsd > remainingBudgetUsd(monthlyBudgetUsd, now)) return null;
  const l = ledger(now);
  const month = l.month;
  l.reservedUsd += amountUsd;
  let open = true;
  const close = (costUsd: number) => {
    if (!open) return;
    open = false;
    // After a month rollover the reservation was already dropped; the cost lands in the new month.
    if (l.month === month) l.reservedUsd = Math.max(0, l.reservedUsd - amountUsd);
    l.spentUsd += Math.max(0, costUsd);
  };
  return { amountUsd, settle: (costUsd) => close(costUsd), release: () => close(0) };
}

/** Counts one request for `ip` today; false (and nothing counted) when it already reached `limit`. */
export function takeDailyRequest(ip: string, limit: number, now = new Date()): boolean {
  const l = ledger(now);
  const used = l.requestsByIp.get(ip) ?? 0;
  if (used >= limit) return false;
  l.requestsByIp.set(ip, used + 1);
  return true;
}

export function requestsLeftToday(ip: string, limit: number, now = new Date()): number {
  return Math.max(0, limit - (ledger(now).requestsByIp.get(ip) ?? 0));
}

/** Tests only. */
export function resetAiLedger(): void {
  delete (globalThis as LedgerHost)[LEDGER_KEY];
}
