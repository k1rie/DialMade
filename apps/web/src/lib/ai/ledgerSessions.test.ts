import { describe, expect, it, vi } from "vitest";
import { supabaseAiLedger, type RpcCall } from "./ledgerSupabase";

const usageRow = { month: "2026-10", spent_usd: 0.25, reserved_usd: 0.01, free_uses_used: 2, ip_requests: 3 };
const sessionRow = { directions_used: 0, directions_max: 2, screens_used: 1, screens_max: 3, actions_used: 0, actions_max: 10, expires_at: "2026-10-11T12:00:00+00:00" };

describe("supabase design sessions (rpc mocked, no network)", () => {
  it("opens, reserves inside and refunds with the session functions", async () => {
    const rpc = vi.fn<RpcCall>(async (fn) => {
      if (fn === "dialmade_ai_session_open") return { data: { ok: true, session_id: "6f1c9a52-0000-4000-8000-000000000002", session: sessionRow, usage: usageRow }, error: null };
      if (fn === "dialmade_ai_session_reserve") return { data: { ok: false, reason: "screens-exhausted", session: sessionRow }, error: null };
      return { data: { ok: true, session: { ...sessionRow, screens_used: 0 } }, error: null };
    });
    const sessions = supabaseAiLedger(rpc).sessions!;
    const opened = await sessions.openSession({
      deviceId: "d",
      ipHash: "i",
      model: "claude-haiku-5-5",
      amountUsd: 0.05,
      monthlyBudgetUsd: 5,
      freeUsesPerMonth: 5,
      maxRequestsPerIpPerDay: 10,
      ttlSeconds: 86400,
      directions: 2,
      screens: 3,
      actions: 10,
    });
    expect(opened).toMatchObject({ ok: true, sessionId: "6f1c9a52-0000-4000-8000-000000000002", session: { screensUsed: 1, expiresAt: "2026-10-11T12:00:00.000Z" } });
    expect(rpc.mock.calls[0]![1]).toMatchObject({ p_ttl_seconds: 86400, p_screens: 3, p_actions: 10, p_directions: 2 });
    const refused = await sessions.reserveInSession({ sessionId: "s", deviceId: "d", kind: "screen", model: "claude-haiku-5-5", amountUsd: 0.01, monthlyBudgetUsd: 5 });
    expect(refused).toMatchObject({ ok: false, reason: "screens-exhausted" });
    expect(await sessions.refundSession("s", "d", "screen")).toMatchObject({ screensUsed: 0 });
  });
});
