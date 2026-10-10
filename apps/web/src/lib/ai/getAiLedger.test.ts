import { describe, expect, it } from "vitest";
import { getAiLedger } from "./getAiLedger";

const supabaseEnv = { NEXT_PUBLIC_SUPABASE_URL: "https://example-ref.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_test_only" };

describe("getAiLedger", () => {
  it("uses Supabase whenever it is configured (no request is made to build the client)", () => {
    expect(getAiLedger({ production: true, serverless: true }, supabaseEnv)?.kind).toBe("supabase");
    expect(getAiLedger({ production: false, serverless: false }, supabaseEnv)?.kind).toBe("supabase");
  });

  it("falls back to memory only in development, and fails closed in production or serverless", () => {
    expect(getAiLedger({ production: false, serverless: false }, {})?.kind).toBe("memory");
    expect(getAiLedger({ production: true, serverless: false }, {})).toBeNull();
    expect(getAiLedger({ production: false, serverless: true }, {})).toBeNull();
  });

  it("DIALMADE_AI_LEDGER=memory keeps local work off the real ledger, never in production", () => {
    expect(getAiLedger({ production: false, serverless: false }, { ...supabaseEnv, DIALMADE_AI_LEDGER: "memory" })?.kind).toBe("memory");
    expect(getAiLedger({ production: true, serverless: false }, { ...supabaseEnv, DIALMADE_AI_LEDGER: "memory" })?.kind).toBe("supabase");
    expect(getAiLedger({ production: true, serverless: false }, { DIALMADE_AI_LEDGER: "memory" })).toBeNull();
  });
});
