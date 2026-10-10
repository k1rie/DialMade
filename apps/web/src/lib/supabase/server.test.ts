import { describe, expect, it } from "vitest";
import { getSupabaseServerClient, isSupabaseConfigured, readSupabaseServerConfig } from "./server";

const env = { NEXT_PUBLIC_SUPABASE_URL: "https://example-ref.supabase.co/", SUPABASE_SECRET_KEY: " sb_secret_test_only " };

describe("supabase server client", () => {
  it("needs both the URL and the secret key", () => {
    expect(readSupabaseServerConfig({})).toBeNull();
    expect(readSupabaseServerConfig({ NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL })).toBeNull();
    expect(readSupabaseServerConfig(env)).toEqual({ url: "https://example-ref.supabase.co", secretKey: "sb_secret_test_only" });
    expect(isSupabaseConfigured(env)).toBe(true);
  });

  it("refuses a publishable key or a URL that is not http(s)", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(readSupabaseServerConfig({ ...env, SUPABASE_SECRET_KEY: "sb_publishable_x" })).toBeNull();
      expect(readSupabaseServerConfig({ ...env, NEXT_PUBLIC_SUPABASE_URL: "example-ref.supabase.co" })).toBeNull();
    } finally {
      console.error = originalError;
    }
  });

  it("builds one client per configuration and none without it", () => {
    expect(getSupabaseServerClient({})).toBeNull();
    const client = getSupabaseServerClient(env);
    expect(client).not.toBeNull();
    expect(getSupabaseServerClient(env)).toBe(client);
    expect(getSupabaseServerClient({ ...env, SUPABASE_SECRET_KEY: "sb_secret_other" })).not.toBe(client);
  });
});
