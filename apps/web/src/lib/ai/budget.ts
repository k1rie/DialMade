// Server only. The ledger IN THE MEMORY OF THE PROCESS, with the same rules as the SQL one
// (supabase/migrations/*_ai_ledger.sql). Not a hard limit with several instances or after a restart, so
// ./getAiLedger only uses it outside production (and tests use it directly).
import { randomUUID } from "node:crypto";
import { RESERVATION_TTL_SECONDS } from "./config";
import { limitReason, type AiLedger, type AiLedgerUsage } from "./ledger";

type Reservation = {
  deviceId: string;
  ipHash: string;
  month: string;
  day: string;
  reservedUsd: number;
  settledUsd: number | null;
  status: "reserved" | "settled" | "released" | "expired";
  createdAt: number;
};

type State = {
  months: Map<string, { spentUsd: number; reservedUsd: number }>;
  /** `${month}|${deviceId}` → free uses used. */
  uses: Map<string, number>;
  /** `${day}|${ipHash}` → requests. */
  ipDays: Map<string, number>;
  reservations: Map<string, Reservation>;
};

const STATE_KEY = Symbol.for("dialmade.ai.memoryLedger");
type StateHost = typeof globalThis & { [STATE_KEY]?: State };

/** One state per process (on globalThis so dev hot reloads keep it). */
function state(): State {
  return ((globalThis as StateHost)[STATE_KEY] ??= { months: new Map(), uses: new Map(), ipDays: new Map(), reservations: new Map() });
}

const monthOf = (now: Date) => now.toISOString().slice(0, 7);
const dayOf = (now: Date) => now.toISOString().slice(0, 10);
const round6 = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

function monthRow(s: State, month: string) {
  let row = s.months.get(month);
  if (!row) s.months.set(month, (row = { spentUsd: 0, reservedUsd: 0 }));
  return row;
}

function usageOf(s: State, month: string, deviceId: string, day: string, ipHash: string): AiLedgerUsage {
  const row = s.months.get(month);
  return {
    month,
    spentUsd: round6(row?.spentUsd ?? 0),
    reservedUsd: round6(row?.reservedUsd ?? 0),
    freeUsesUsed: s.uses.get(`${month}|${deviceId}`) ?? 0,
    ipRequestsToday: s.ipDays.get(`${day}|${ipHash}`) ?? 0,
  };
}

/** Unanswered reservations past the TTL are charged in full (unknown outcome). */
function expire(s: State, now: Date): void {
  const limit = now.getTime() - RESERVATION_TTL_SECONDS * 1000;
  for (const reservation of s.reservations.values()) {
    if (reservation.status !== "reserved" || reservation.createdAt >= limit) continue;
    const row = monthRow(s, reservation.month);
    row.reservedUsd = Math.max(0, row.reservedUsd - reservation.reservedUsd);
    row.spentUsd += reservation.reservedUsd;
    reservation.status = "expired";
    reservation.settledUsd = reservation.reservedUsd;
  }
  const today = dayOf(now);
  for (const key of s.ipDays.keys()) if (!key.startsWith(`${today}|`)) s.ipDays.delete(key);
}

export function memoryAiLedger(): AiLedger {
  const usageAfter = (s: State, r: Reservation) => usageOf(s, r.month, r.deviceId, r.day, r.ipHash);

  return {
    kind: "memory",
    async usage({ deviceId, ipHash, now = new Date() }) {
      return usageOf(state(), monthOf(now), deviceId, dayOf(now), ipHash);
    },
    async reserve(request) {
      const now = request.now ?? new Date();
      const s = state();
      expire(s, now);
      const month = monthOf(now);
      const day = dayOf(now);
      const amountUsd = round6(request.amountUsd);
      if (!(amountUsd >= 0)) throw new RangeError("amountUsd must be a number >= 0");
      const before = usageOf(s, month, request.deviceId, day, request.ipHash);
      const reason = limitReason(before, request, amountUsd);
      if (reason) return { ok: false, reason, usage: before };

      monthRow(s, month).reservedUsd += amountUsd;
      s.uses.set(`${month}|${request.deviceId}`, before.freeUsesUsed + 1);
      s.ipDays.set(`${day}|${request.ipHash}`, before.ipRequestsToday + 1);
      const reservationId = randomUUID();
      s.reservations.set(reservationId, {
        deviceId: request.deviceId,
        ipHash: request.ipHash,
        month,
        day,
        reservedUsd: amountUsd,
        settledUsd: null,
        status: "reserved",
        createdAt: now.getTime(),
      });
      return { ok: true, reservationId, usage: usageOf(s, month, request.deviceId, day, request.ipHash) };
    },
    async settle(reservationId, costUsd) {
      const s = state();
      const r = s.reservations.get(reservationId);
      if (!r) return null;
      const cost = round6(Math.max(0, costUsd));
      const row = monthRow(s, r.month);
      if (r.status === "reserved") {
        row.reservedUsd = Math.max(0, row.reservedUsd - r.reservedUsd);
        row.spentUsd += cost;
      } else if (r.status === "expired") {
        row.spentUsd = Math.max(0, row.spentUsd + cost - (r.settledUsd ?? 0));
      } else {
        return usageAfter(s, r);
      }
      r.status = "settled";
      r.settledUsd = cost;
      return usageAfter(s, r);
    },
    async release(reservationId) {
      const s = state();
      const r = s.reservations.get(reservationId);
      if (!r) return null;
      const row = monthRow(s, r.month);
      if (r.status === "reserved") row.reservedUsd = Math.max(0, row.reservedUsd - r.reservedUsd);
      else if (r.status === "expired") row.spentUsd = Math.max(0, row.spentUsd - (r.settledUsd ?? 0));
      else return usageAfter(s, r);
      const key = `${r.month}|${r.deviceId}`;
      s.uses.set(key, Math.max(0, (s.uses.get(key) ?? 0) - 1));
      r.status = "released";
      r.settledUsd = 0;
      return usageAfter(s, r);
    },
  };
}

/** Tests only. */
export function resetAiLedger(): void {
  delete (globalThis as StateHost)[STATE_KEY];
}
