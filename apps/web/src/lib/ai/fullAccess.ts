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

/** Whether the signed-in account behind `request` has full access. Never throws. */
export async function hasFullAccess(request: Request): Promise<boolean> {
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
