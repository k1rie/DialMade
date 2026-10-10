// Server only.
import { getSupabaseServerClient } from "../supabase/server";
import { memoryAiLedger } from "./budget";
import type { AiLedger } from "./ledger";
import { supabaseAiLedger } from "./ledgerSupabase";

type Env = Readonly<Record<string, string | undefined>>;

/**
 * The ledger for this process: Supabase when configured; otherwise the memory one, but only outside
 * production and serverless (DIALMADE_AI_LEDGER=memory forces it there, e.g. to keep local tests off the
 * real ledger). `null` = the hosted AI stays off: a per-process counter is not a hard limit in production.
 */
export function getAiLedger(config: { production: boolean; serverless: boolean }, env: Env = process.env): AiLedger | null {
  const memoryAllowed = !config.production && !config.serverless;
  if (memoryAllowed && env.DIALMADE_AI_LEDGER?.trim() === "memory") return memoryAiLedger();
  const supabase = getSupabaseServerClient(env);
  if (supabase) return supabaseAiLedger((fn, args) => supabase.rpc(fn, args));
  return memoryAllowed ? memoryAiLedger() : null;
}
