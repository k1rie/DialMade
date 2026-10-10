// Server only. The ledger in Supabase: every call is one security definer function of
// supabase/migrations/*_ai_ledger.sql (executable only with the secret key), so each step is atomic in
// the database and concurrent requests on any instance share the same counters.
import { z } from "zod";
import { AiLedgerError, type AiLedger, type AiLedgerUsage, type AiSessionCounters, type AiSessionLedger } from "./ledger";

export type RpcResult = { data: unknown; error: { message: string; code?: string } | null };
/** `supabase.rpc` reduced to what the ledger needs (a mock in tests). */
export type RpcCall = (fn: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;

const UsageRow = z.object({
  month: z.string(),
  spent_usd: z.coerce.number().nonnegative(),
  reserved_usd: z.coerce.number().nonnegative(),
  free_uses_used: z.coerce.number().int().nonnegative(),
  ip_requests: z.coerce.number().int().nonnegative(),
});

const ReserveRow = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), reservation_id: z.string().min(1), usage: UsageRow }),
  z.object({ ok: z.literal(false), reason: z.enum(["free-tier-exhausted", "daily-limit", "budget-exceeded"]), usage: UsageRow }),
]);

const CloseRow = z.object({ ok: z.boolean(), reason: z.string().optional(), usage: UsageRow.optional() });

const toUsage = (row: z.infer<typeof UsageRow>): AiLedgerUsage => ({
  month: row.month,
  spentUsd: row.spent_usd,
  reservedUsd: row.reserved_usd,
  freeUsesUsed: row.free_uses_used,
  ipRequestsToday: row.ip_requests,
});

const roundUsd6 = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

const SessionRow = z.object({
  directions_used: z.coerce.number().int().nonnegative(),
  directions_max: z.coerce.number().int().nonnegative(),
  screens_used: z.coerce.number().int().nonnegative(),
  screens_max: z.coerce.number().int().nonnegative(),
  actions_used: z.coerce.number().int().nonnegative(),
  actions_max: z.coerce.number().int().nonnegative(),
  expires_at: z.string(),
});
const toSession = (row: z.infer<typeof SessionRow>): AiSessionCounters => ({
  directionsUsed: row.directions_used,
  directionsMax: row.directions_max,
  screensUsed: row.screens_used,
  screensMax: row.screens_max,
  actionsUsed: row.actions_used,
  actionsMax: row.actions_max,
  expiresAt: new Date(row.expires_at).toISOString(),
});
const OpenRow = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), session_id: z.string().min(1), session: SessionRow, usage: UsageRow }),
  z.object({ ok: z.literal(false), reason: z.enum(["free-tier-exhausted", "daily-limit", "budget-exceeded"]), usage: UsageRow }),
]);
const SessionReserveRow = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), reservation_id: z.string().min(1), session: SessionRow, usage: UsageRow }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(["not-found", "expired", "directions-exhausted", "screens-exhausted", "actions-exhausted", "budget-exceeded"]),
    session: SessionRow.optional(),
    usage: UsageRow.optional(),
  }),
]);
const PeekRow = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), session: SessionRow }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(["not-found", "expired", "directions-exhausted", "screens-exhausted", "actions-exhausted", "budget-exceeded"]),
    session: SessionRow.optional(),
    usage: UsageRow.optional(),
  }),
]);
const RefundRow = z.object({ ok: z.boolean(), session: SessionRow.optional() });

export function supabaseAiLedger(rpc: RpcCall): AiLedger {
  async function call<T>(fn: string, args: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
    let result: RpcResult;
    try {
      result = await rpc(fn, args);
    } catch (cause) {
      throw new AiLedgerError(`${fn}: request failed`, { cause });
    }
    if (result.error) throw new AiLedgerError(`${fn}: ${result.error.code ?? "error"} ${result.error.message}`);
    const parsed = schema.safeParse(result.data);
    if (!parsed.success) throw new AiLedgerError(`${fn}: unexpected answer`);
    return parsed.data;
  }

  const sessions: AiSessionLedger = {
    async openSession(request) {
      const row = await call(
        "dialmade_ai_session_open",
        {
          p_device_id: request.deviceId,
          p_ip_hash: request.ipHash,
          p_model: request.model,
          p_amount_usd: roundUsd6(request.amountUsd),
          p_monthly_budget_usd: request.monthlyBudgetUsd,
          p_free_uses_per_month: request.freeUsesPerMonth,
          p_max_requests_per_ip_per_day: request.maxRequestsPerIpPerDay,
          p_ttl_seconds: request.ttlSeconds,
          p_directions: request.directions,
          p_screens: request.screens,
          p_actions: request.actions,
        },
        OpenRow,
      );
      return row.ok
        ? { ok: true, sessionId: row.session_id, session: toSession(row.session), usage: toUsage(row.usage) }
        : { ok: false, reason: row.reason, usage: toUsage(row.usage) };
    },
    async reserveInSession(request) {
      const row = await call(
        "dialmade_ai_session_reserve",
        {
          p_session_id: request.sessionId,
          p_device_id: request.deviceId,
          p_kind: request.kind,
          p_model: request.model,
          p_amount_usd: roundUsd6(request.amountUsd),
          p_monthly_budget_usd: request.monthlyBudgetUsd,
        },
        SessionReserveRow,
      );
      if (row.ok) return { ok: true, reservationId: row.reservation_id, session: toSession(row.session), usage: toUsage(row.usage) };
      return { ok: false, reason: row.reason, ...(row.session && { session: toSession(row.session) }), ...(row.usage && { usage: toUsage(row.usage) }) };
    },
    async peekSession(request) {
      const row = await call(
        "dialmade_ai_session_peek",
        { p_session_id: request.sessionId, p_device_id: request.deviceId, p_kind: request.kind, p_monthly_budget_usd: request.monthlyBudgetUsd },
        PeekRow,
      );
      if (row.ok) return { ok: true, session: toSession(row.session) };
      return { ok: false, reason: row.reason, ...(row.session && { session: toSession(row.session) }), ...(row.usage && { usage: toUsage(row.usage) }) };
    },
    async refundSession(sessionId, deviceId, kind) {
      const row = await call("dialmade_ai_session_refund", { p_session_id: sessionId, p_device_id: deviceId, p_kind: kind }, RefundRow);
      return row.session ? toSession(row.session) : null;
    },
  };

  return {
    kind: "supabase",
    sessions,
    async usage({ deviceId, ipHash }) {
      return toUsage(await call("dialmade_ai_usage", { p_device_id: deviceId, p_ip_hash: ipHash }, UsageRow));
    },
    async reserve(request) {
      const row = await call(
        "dialmade_ai_reserve",
        {
          p_device_id: request.deviceId,
          p_ip_hash: request.ipHash,
          p_model: request.model,
          p_amount_usd: roundUsd6(request.amountUsd),
          p_monthly_budget_usd: request.monthlyBudgetUsd,
          p_free_uses_per_month: request.freeUsesPerMonth,
          p_max_requests_per_ip_per_day: request.maxRequestsPerIpPerDay,
        },
        ReserveRow,
      );
      return row.ok
        ? { ok: true, reservationId: row.reservation_id, usage: toUsage(row.usage) }
        : { ok: false, reason: row.reason, usage: toUsage(row.usage) };
    },
    async settle(reservationId, costUsd) {
      const row = await call("dialmade_ai_settle", { p_reservation_id: reservationId, p_cost_usd: roundUsd6(Math.max(0, costUsd)) }, CloseRow);
      return row.usage ? toUsage(row.usage) : null;
    },
    async release(reservationId) {
      const row = await call("dialmade_ai_release", { p_reservation_id: reservationId }, CloseRow);
      return row.usage ? toUsage(row.usage) : null;
    },
  };
}
