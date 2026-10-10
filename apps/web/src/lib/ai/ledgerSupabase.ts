// Server only. The ledger in Supabase: every call is one security definer function of
// supabase/migrations/*_ai_ledger.sql (executable only with the secret key), so each step is atomic in
// the database and concurrent requests on any instance share the same counters.
import { z } from "zod";
import { AiLedgerError, type AiLedger, type AiLedgerUsage } from "./ledger";

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

  return {
    kind: "supabase",
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
