// Server only. Fixed-window counters in `dialmade.rate_limits`, shared by every serverless instance: one
// atomic upsert per hit. Used for magic links (per email, and per day overall) and «Mis diseños» writes.
import { sql, type Kysely } from "kysely";
import type { Database } from "./schema";

/** Counts one hit for `key` in the current window. `false` when the window already had `max` hits. */
export async function takeRateLimit(db: Kysely<Database>, key: string, windowSeconds: number, max: number): Promise<boolean> {
  const { rows } = await sql<{ hits: number }>`
    insert into dialmade.rate_limits (key, window_start, hits)
    values (${key}, to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds}), 1)
    on conflict (key, window_start) do update set hits = dialmade.rate_limits.hits + 1
    returning hits
  `.execute(db);
  // Housekeeping: windows are at most a day long.
  await sql`delete from dialmade.rate_limits where window_start < now() - interval '2 days'`.execute(db);
  return Number(rows[0]?.hits ?? max + 1) <= max;
}
