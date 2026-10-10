// Server only. Magic links per email address per hour, on top of Better Auth's per-IP limit: someone
// rotating IPs cannot flood one inbox. The address is stored as an HMAC (never in clear) and rows older
// than a day are dropped.
import { createHmac } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { Database } from "@/lib/db/schema";

export const MAGIC_LINKS_PER_EMAIL_PER_HOUR = 5;

export const emailKey = (email: string, secret: string) =>
  createHmac("sha256", secret).update(`dialmade-email:v1:${email.trim().toLowerCase()}`).digest("hex");

/** Counts one send for `email` in this UTC hour. `false` when the hour's quota is used up. */
export async function takeMagicLinkSend(db: Kysely<Database>, email: string, secret: string, max = MAGIC_LINKS_PER_EMAIL_PER_HOUR): Promise<boolean> {
  const key = emailKey(email, secret);
  const { rows } = await sql<{ sends: number }>`
    insert into dialmade.auth_email_throttle (email_hash, window_start, sends)
    values (${key}, date_trunc('hour', now()), 1)
    on conflict (email_hash, window_start) do update set sends = dialmade.auth_email_throttle.sends + 1
    returning sends
  `.execute(db);
  await sql`delete from dialmade.auth_email_throttle where window_start < now() - interval '1 day'`.execute(db);
  return Number(rows[0]?.sends ?? max + 1) <= max;
}
