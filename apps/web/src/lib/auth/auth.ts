// Server only. Better Auth for Dialmade: magic link, GitHub/Google (when configured), passkeys and anonymous
// devices that become accounts on sign-in. Tables in the Postgres schema `dialmade_auth`
// (supabase/migrations/*_auth_designs.sql). Billing (Stripe) is installed and off (`billing.ts`).
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { anonymous, magicLink } from "better-auth/plugins";
import type { Kysely } from "kysely";
import { AUTH_SCHEMA, getDatabase } from "@/lib/db/database";
import type { Database } from "@/lib/db/schema";
import { createDesignRepository, type DesignRepository } from "@/lib/designs/repository";
import { billingPlugin } from "./billing";
import { readAuthConfig, type AuthServerConfig } from "./config";
import { createEmailSender, magicLinkEmail, type EmailSender } from "./email";
import { takeMagicLinkSend } from "./emailThrottle";

/** Set by the route handler from the trusted client IP (`clientIp`); a client-sent value is always replaced. */
export const CLIENT_IP_HEADER = "x-dialmade-client-ip";

/** Magic links live 10 minutes (the email says so). */
export const MAGIC_LINK_TTL_SECONDS = 10 * 60;

const DAY = 24 * 60 * 60;

/** Per IP (IPv6 grouped by /64), in Better Auth's `rateLimit` table so every serverless instance shares it. */
export const RATE_LIMIT_RULES = {
  "/sign-in/magic-link": { window: 10 * 60, max: 5 },
  "/magic-link/verify": { window: 60, max: 10 },
  "/sign-in/social": { window: 60, max: 10 },
  "/sign-in/anonymous": { window: 60 * 60, max: 5 },
  "/passkey/*": { window: 60, max: 20 },
  "/get-session": { window: 60, max: 120 },
} as const;

export type AuthDeps = {
  config: AuthServerConfig;
  db: Kysely<Database>;
  email: EmailSender;
  designs: DesignRepository;
};

export function createAuth({ config, db, email, designs }: AuthDeps) {
  return betterAuth({
    appName: "Dialmade",
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    // Better Auth types its own tables; ours are typed in Database.
    database: { db: db as unknown as Kysely<never>, type: "postgres", schemaName: AUTH_SCHEMA, transaction: true },
    telemetry: { enabled: false },
    session: { expiresIn: 30 * DAY, updateAge: DAY, freshAge: DAY },
    account: {
      // GitHub/Google join an existing account only with the same, provider-verified email.
      accountLinking: { enabled: true, allowDifferentEmails: false },
    },
    socialProviders: {
      ...(config.github && { github: { clientId: config.github.clientId, clientSecret: config.github.clientSecret } }),
      ...(config.google && { google: { clientId: config.google.clientId, clientSecret: config.google.clientSecret, prompt: "select_account" as const } }),
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 100, customRules: RATE_LIMIT_RULES },
    advanced: {
      // Explicit: Better Auth turns both checks off when it thinks it runs under a test runner.
      disableOriginCheck: false,
      disableCSRFCheck: false,
      cookiePrefix: "dialmade",
      useSecureCookies: config.production,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER], ipv6Subnet: 64 },
    },
    plugins: [
      magicLink({
        expiresIn: MAGIC_LINK_TTL_SECONDS,
        storeToken: "hashed",
        sendMagicLink: async ({ email: to, url, metadata }) => {
          if (!(await takeMagicLinkSend(db, to, config.secret))) throw APIError.from("TOO_MANY_REQUESTS", { code: "TOO_MANY_EMAILS", message: "Too many links for this email" });
          try {
            await email.send(magicLinkEmail(to, url, metadata?.locale));
          } catch (error) {
            console.error("[auth] the magic link email was not sent:", (error as Error).message);
            throw APIError.from("INTERNAL_SERVER_ERROR", { code: "EMAIL_NOT_SENT", message: "The email could not be sent" });
          }
        },
      }),
      anonymous({
        generateName: () => "Dialmade",
        // The device signs in: its designs move to the account before Better Auth deletes the anonymous user.
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await designs.transferAll(anonymousUser.user.id, newUser.user.id);
        },
      }),
      passkey({ rpID: config.passkey.rpID, rpName: config.passkey.rpName, origin: config.passkey.origin }),
      ...(config.billing ? [billingPlugin(config.billing)] : []),
    ],
  });
}

export type DialmadeAuth = ReturnType<typeof createAuth>;

const AUTH_KEY = Symbol.for("dialmade.auth");
type AuthHost = typeof globalThis & { [AUTH_KEY]?: { key: string; auth: DialmadeAuth } };

/** Better Auth for this process, or `null` when auth is off (no DATABASE_URL, or production without its secrets). */
export function getAuth(env: Readonly<Record<string, string | undefined>> = process.env): DialmadeAuth | null {
  const config = readAuthConfig(env);
  const database = config && getDatabase(env);
  if (!config || !database) return null;
  const key = JSON.stringify(config);
  const host = globalThis as AuthHost;
  if (host[AUTH_KEY]?.key === key) return host[AUTH_KEY].auth;
  const email = config.email ? createEmailSender(config.email) : unavailableSender;
  const auth = createAuth({ config, db: database.db, email, designs: createDesignRepository(database.db) });
  host[AUTH_KEY] = { key, auth };
  return auth;
}

/** Production without Resend/SMTP: the UI hides the magic link, and a direct call fails here. */
const unavailableSender: EmailSender = {
  kind: "console",
  async send() {
    throw new Error("No email transport configured");
  },
};
