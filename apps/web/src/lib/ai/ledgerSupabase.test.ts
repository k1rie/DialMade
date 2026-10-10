import { describe, expect, it, vi } from "vitest";
import { AiLedgerError } from "./ledger";
import { supabaseAiLedger, type RpcCall, type RpcResult } from "./ledgerSupabase";

const usageRow = { month: "2026-10", spent_usd: 0.25, reserved_usd: 0.01, free_uses_used: 2, ip_requests: 3 };

function mockRpc(answer: (fn: string, args: Record<string, unknown>) => RpcResult | Promise<RpcResult>) {
  return vi.fn<RpcCall>(async (fn, args) => answer(fn, args));
}

describe("supabase ledger (rpc mocked, no network)", () => {
  it("reads the counters with dialmade_ai_usage", async () => {
    const rpc = mockRpc(() => ({ data: usageRow, error: null }));
    const usage = await supabaseAiLedger(rpc).usage({ deviceId: "device-a", ipHash: "ip-a" });
    expect(rpc).toHaveBeenCalledWith("dialmade_ai_usage", { p_device_id: "device-a", p_ip_hash: "ip-a" });
    expect(usage).toEqual({ month: "2026-10", spentUsd: 0.25, reservedUsd: 0.01, freeUsesUsed: 2, ipRequestsToday: 3 });
  });

  it("reserves with the limits from the env and maps both outcomes", async () => {
    const rpc = mockRpc((_, args) =>
      args.p_device_id === "device-a"
        ? { data: { ok: true, reservation_id: "6f1c9a52-0000-4000-8000-000000000001", usage: usageRow }, error: null }
        : { data: { ok: false, reason: "free-tier-exhausted", usage: { ...usageRow, free_uses_used: 5 } }, error: null },
    );
    const ledger = supabaseAiLedger(rpc);
    const limits = { monthlyBudgetUsd: 5, freeUsesPerMonth: 5, maxRequestsPerIpPerDay: 10 };
    const ok = await ledger.reserve({ deviceId: "device-a", ipHash: "ip-a", model: "claude-haiku-5-5", amountUsd: 0.0123456789, ...limits });
    expect(ok).toMatchObject({ ok: true, reservationId: "6f1c9a52-0000-4000-8000-000000000001" });
    expect(rpc.mock.calls[0]).toEqual([
      "dialmade_ai_reserve",
      {
        p_device_id: "device-a",
        p_ip_hash: "ip-a",
        p_model: "claude-haiku-5-5",
        p_amount_usd: 0.012346,
        p_monthly_budget_usd: 5,
        p_free_uses_per_month: 5,
        p_max_requests_per_ip_per_day: 10,
      },
    ]);
    const denied = await ledger.reserve({ deviceId: "device-b", ipHash: "ip-a", model: "claude-haiku-5-5", amountUsd: 0.01, ...limits });
    expect(denied).toMatchObject({ ok: false, reason: "free-tier-exhausted", usage: { freeUsesUsed: 5 } });
  });

  it("settles and releases by reservation id", async () => {
    const rpc = mockRpc(() => ({ data: { ok: true, usage: usageRow }, error: null }));
    const ledger = supabaseAiLedger(rpc);
    expect(await ledger.settle("r1", 0.0004)).toMatchObject({ spentUsd: 0.25 });
    expect(rpc).toHaveBeenLastCalledWith("dialmade_ai_settle", { p_reservation_id: "r1", p_cost_usd: 0.0004 });
    await ledger.release("r1");
    expect(rpc).toHaveBeenLastCalledWith("dialmade_ai_release", { p_reservation_id: "r1" });

    const missing = supabaseAiLedger(mockRpc(() => ({ data: { ok: false, reason: "not-found" }, error: null })));
    expect(await missing.settle("nope", 0)).toBeNull();
  });

  it("turns database errors, thrown requests and unexpected answers into AiLedgerError", async () => {
    const failing = supabaseAiLedger(mockRpc(() => ({ data: null, error: { message: "permission denied", code: "42501" } })));
    await expect(failing.usage({ deviceId: "d", ipHash: "i" })).rejects.toBeInstanceOf(AiLedgerError);
    const throwing = supabaseAiLedger(
      mockRpc(() => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(throwing.usage({ deviceId: "d", ipHash: "i" })).rejects.toBeInstanceOf(AiLedgerError);
    const odd = supabaseAiLedger(mockRpc(() => ({ data: { ok: "yes" }, error: null })));
    await expect(odd.reserve({ deviceId: "d", ipHash: "i", model: "m", amountUsd: 0, monthlyBudgetUsd: 1, freeUsesPerMonth: 1, maxRequestsPerIpPerDay: 1 })).rejects.toBeInstanceOf(
      AiLedgerError,
    );
  });
});
