// Server only. «Acceso completo» to the hosted AI (supabase/migrations/20261011090000_ai_full_access.sql): accounts
// listed in `dialmade.ai_full_access` get many more uses than the free tier and, in «Diseño con IA», every finish and
// model (./render/fullAccessModel.ts). The global monthly budget (DIALMADE_AI_MONTHLY_BUDGET_USD) still caps every
// call: it stays the hard spending limit. Checked on every request from the Better Auth session; anonymous devices,
// a missing table or a database error all mean «free tier» (fails closed).
import { sql } from "kysely";
import { getSessionUser } from "@/lib/auth/server";
import { getDatabase } from "@/lib/db/database";
import type { AiServerConfig } from "./serverConfig";

/** Uses per month and requests per IP per day of a full-access account (the ledger's SQL accepts any count). */
export const FULL_ACCESS_USES_PER_MONTH = 1000;
export const FULL_ACCESS_REQUESTS_PER_DAY = 1000;

/**
 * TEMPORARY (the owner asked for it on 2026-10-10 and will say when to turn it off): while this is `true` every
 * caller has full access, signed in or not, so the model picker and every finish are open to everyone. The global
 * monthly budget and the per-IP daily limit still apply. Turning it off is setting it to `false` and deploying:
 * `ai_full_access` then decides again.
 */
export const FULL_ACCESS_FOR_EVERYONE = true;

/** Whether the caller behind `request` has full access: everyone while `FULL_ACCESS_FOR_EVERYONE`, else the signed-in account. Never throws. */
export async function hasFullAccess(request: Request): Promise<boolean> {
  if (FULL_ACCESS_FOR_EVERYONE) return true;
  const database = getDatabase();
  if (!database) return false;
  const user = await getSessionUser(request);
  if (!user || user.isAnonymous) return false;
  try {
    const { rows } = await sql<{ one: number }>`select 1 as one from dialmade.ai_full_access where user_id = ${user.id} limit 1`.execute(database.db);
    return rows.length > 0;
  } catch (error) {
    console.error("[ai] full access lookup failed (free tier instead):", (error as Error).message);
    return false;
  }
}

/** The server config as a full-access account sees it: its own limits, same budget, same key. */
export const fullAccessConfig = (config: AiServerConfig): AiServerConfig => ({
  ...config,
  freeUsesPerMonth: Math.max(config.freeUsesPerMonth, FULL_ACCESS_USES_PER_MONTH),
  maxRequestsPerIpPerDay: Math.max(config.maxRequestsPerIpPerDay, FULL_ACCESS_REQUESTS_PER_DAY),
});
