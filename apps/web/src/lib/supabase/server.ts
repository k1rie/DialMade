// Server only: uses SUPABASE_SECRET_KEY (service_role). Never import it from client components.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Env = Readonly<Record<string, string | undefined>>;

export type SupabaseServerConfig = { url: string; secretKey: string };

/** `null` when Supabase is not configured (or misconfigured: then it also logs why, never the values). */
export function readSupabaseServerConfig(env: Env = process.env): SupabaseServerConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secretKey) return null;
  if (!/^https?:\/\/[^\s/]+/.test(url)) {
    console.error("[supabase] NEXT_PUBLIC_SUPABASE_URL is not an http(s) URL");
    return null;
  }
  if (secretKey.startsWith("sb_publishable_")) {
    console.error("[supabase] SUPABASE_SECRET_KEY holds a publishable key; the server needs the secret key");
    return null;
  }
  return { url, secretKey };
}

export const isSupabaseConfigured = (env: Env = process.env): boolean => readSupabaseServerConfig(env) !== null;

/** Ledger reads and writes must never be served from a cache. */
const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

const CLIENT_KEY = Symbol.for("dialmade.supabase.server");
type ClientHost = typeof globalThis & { [CLIENT_KEY]?: { url: string; secretKey: string; client: SupabaseClient } };

/**
 * Service-role client (bypasses RLS) for server code, or `null` without Supabase. One per process,
 * stateless: no session, no token refresh, no URL detection.
 */
export function getSupabaseServerClient(env: Env = process.env): SupabaseClient | null {
  const config = readSupabaseServerConfig(env);
  if (!config) return null;
  const host = globalThis as ClientHost;
  const cached = host[CLIENT_KEY];
  if (cached && cached.url === config.url && cached.secretKey === config.secretKey) return cached.client;
  const client = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: noStoreFetch },
  });
  host[CLIENT_KEY] = { ...config, client };
  return client;
}
