// Server only. Magic links, on top of Better Auth's per-IP limit:
// - per email address per hour, so someone rotating IPs cannot flood one inbox (stored as an HMAC);
// - per day overall, so a script cannot burn the email provider's quota (Resend's free tier is 100/day).
import { createHmac } from "node:crypto";
import type { Kysely } from "kysely";
import { takeRateLimit } from "@/lib/db/rateLimit";
import type { Database } from "@/lib/db/schema";

export const MAGIC_LINKS_PER_EMAIL_PER_HOUR = 5;
export const DEFAULT_EMAILS_PER_DAY = 90;

export const emailKey = (email: string, secret: string) =>
  createHmac("sha256", secret).update(`dialmade-email:v1:${email.trim().toLowerCase()}`).digest("hex");

/** DIALMADE_EMAIL_DAILY_CAP: magic links per UTC day for the whole app. */
export function emailsPerDay(env: Readonly<Record<string, string | undefined>> = process.env): number {
  const value = Number(env.DIALMADE_EMAIL_DAILY_CAP);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_EMAILS_PER_DAY;
}

/** Counts one send. `false` when this address used its hour, or the app its day. */
export async function takeMagicLinkSend(db: Kysely<Database>, email: string, secret: string, limits = { perEmail: MAGIC_LINKS_PER_EMAIL_PER_HOUR, perDay: emailsPerDay() }): Promise<boolean> {
  if (!(await takeRateLimit(db, `email:${emailKey(email, secret)}`, 60 * 60, limits.perEmail))) return false;
  return takeRateLimit(db, "email:all", 24 * 60 * 60, limits.perDay);
}
