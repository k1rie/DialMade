// Server only. The ledger IN THE MEMORY OF THE PROCESS, with the same rules as the SQL one
// (supabase/migrations/*_ai_ledger.sql). Not a hard limit with several instances or after a restart, so
// ./getAiLedger only uses it outside production (and tests use it directly).
import { randomUUID } from "node:crypto";
import { RESERVATION_TTL_SECONDS } from "./config";
import { limitReason, type AiLedger, type AiLedgerUsage, type AiSessionCounters, type AiSessionKind, type AiSessionLedger } from "./ledger";

type Reservation = {
  deviceId: string;
  ipHash: string;
  month: string;
  day: string;
  reservedUsd: number;
  settledUsd: number | null;
  status: "reserved" | "settled" | "released" | "expired";
  createdAt: number;
  /** Reserved inside a design session: no free use to give back on release. */
  sessionId?: string;
};

type Session = AiSessionCounters & { deviceId: string; ipHash: string; month: string; day: string; expiresAtMs: number };

type State = {
  months: Map<string, { spentUsd: number; reservedUsd: number }>;
  /** `${month}|${deviceId}` → free uses used. */
  uses: Map<string, number>;
  /** `${day}|${ipHash}` → requests. */
  ipDays: Map<string, number>;
  reservations: Map<string, Reservation>;
  sessions: Map<string, Session>;
};

const STATE_KEY = Symbol.for("dialmade.ai.memoryLedger");
type StateHost = typeof globalThis & { [STATE_KEY]?: State };

/** One state per process (on globalThis so dev hot reloads keep it). */
function state(): State {
  return ((globalThis as StateHost)[STATE_KEY] ??= { months: new Map(), uses: new Map(), ipDays: new Map(), reservations: new Map(), sessions: new Map() });
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
    sessions: memorySessions(),
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
      if (!r.sessionId) {
        const key = `${r.month}|${r.deviceId}`;
        s.uses.set(key, Math.max(0, (s.uses.get(key) ?? 0) - 1));
      }
      r.status = "released";
      r.settledUsd = 0;
      return usageAfter(s, r);
    },
  };
}

const counters = ({ directionsUsed, directionsMax, screensUsed, screensMax, actionsUsed, actionsMax, expiresAt }: Session): AiSessionCounters => ({
  directionsUsed,
  directionsMax,
  screensUsed,
  screensMax,
  actionsUsed,
  actionsMax,
  expiresAt,
});

const FIELD: Record<AiSessionKind, ["directionsUsed", "directionsMax"] | ["screensUsed", "screensMax"] | ["actionsUsed", "actionsMax"]> = {
  direction: ["directionsUsed", "directionsMax"],
  screen: ["screensUsed", "screensMax"],
  action: ["actionsUsed", "actionsMax"],
};

/** Design sessions of «Diseño con IA», same rules as supabase/migrations/*_ai_render_sessions.sql. */
function memorySessions(): AiSessionLedger {
  return {
    async openSession(request) {
      const now = request.now ?? new Date();
      const s = state();
      expire(s, now);
      const month = monthOf(now);
      const day = dayOf(now);
      const before = usageOf(s, month, request.deviceId, day, request.ipHash);
      const reason = limitReason(before, request, round6(request.amountUsd));
      if (reason) return { ok: false, reason, usage: before };
      s.uses.set(`${month}|${request.deviceId}`, before.freeUsesUsed + 1);
      s.ipDays.set(`${day}|${request.ipHash}`, before.ipRequestsToday + 1);
      const sessionId = randomUUID();
      const expiresAtMs = now.getTime() + request.ttlSeconds * 1000;
      const session: Session = {
        deviceId: request.deviceId,
        ipHash: request.ipHash,
        month,
        day,
        expiresAtMs,
        expiresAt: new Date(expiresAtMs).toISOString(),
        directionsUsed: 0,
        directionsMax: request.directions,
        screensUsed: 0,
        screensMax: request.screens,
        actionsUsed: 0,
        actionsMax: request.actions,
      };
      s.sessions.set(sessionId, session);
      return { ok: true, sessionId, session: counters(session), usage: usageOf(s, month, request.deviceId, day, request.ipHash) };
    },
    async reserveInSession(request) {
      const now = request.now ?? new Date();
      const s = state();
      expire(s, now);
      const session = s.sessions.get(request.sessionId);
      if (!session || session.deviceId !== request.deviceId) return { ok: false, reason: "not-found" };
      if (now.getTime() >= session.expiresAtMs) return { ok: false, reason: "expired", session: counters(session) };
      const [used, max] = FIELD[request.kind];
      if (session[used] >= session[max]) return { ok: false, reason: `${request.kind}s-exhausted` as const, session: counters(session) };
      const month = monthOf(now);
      const day = dayOf(now);
      const amountUsd = round6(request.amountUsd);
      if (!(amountUsd >= 0)) throw new RangeError("amountUsd must be a number >= 0");
      const usage = usageOf(s, month, session.deviceId, day, session.ipHash);
      const left = request.monthlyBudgetUsd - usage.spentUsd - usage.reservedUsd;
      if (left <= 0 || amountUsd > left) return { ok: false, reason: "budget-exceeded", session: counters(session), usage };
      session[used]++;
      monthRow(s, month).reservedUsd += amountUsd;
      const reservationId = randomUUID();
      s.reservations.set(reservationId, {
        deviceId: session.deviceId,
        ipHash: session.ipHash,
        month,
        day,
        reservedUsd: amountUsd,
        settledUsd: null,
        status: "reserved",
        createdAt: now.getTime(),
        sessionId: request.sessionId,
      });
      return { ok: true, reservationId, session: counters(session), usage: usageOf(s, month, session.deviceId, day, session.ipHash) };
    },
    async refundSession(sessionId, deviceId, kind) {
      const session = state().sessions.get(sessionId);
      if (!session || session.deviceId !== deviceId) return null;
      const [used] = FIELD[kind];
      session[used] = Math.max(0, session[used] - 1);
      return counters(session);
    },
  };
}

/** Tests only. */
export function resetAiLedger(): void {
  delete (globalThis as StateHost)[STATE_KEY];
}
