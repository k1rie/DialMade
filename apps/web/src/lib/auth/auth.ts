// Server only. Better Auth for Dialmade: magic link, GitHub/Google (when configured), passkeys and anonymous
// devices that become accounts on sign-in. Tables in the Postgres schema `dialmade_auth`
// (supabase/migrations/*_auth_designs.sql). Billing (Stripe) is installed and off (`billing.ts`).
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { anonymous, magicLink } from "better-auth/plugins";
import type { Kysely } from "kysely";
import { AUTH_SCHEMA, getDatabase } from "@/lib/db/database";
import type { Database } from "@/lib/db/schema";
import { createDesignRepository, type DesignRepository } from "@/lib/designs/repository";
import { limitsFor } from "@/lib/designs/serialize";
import { billingPlugin } from "./billing";
import { readAuthConfig, type AuthServerConfig } from "./config";
import { createEmailSender, magicLinkEmail, type EmailSender } from "./email";
import { takeMagicLinkSend } from "./emailThrottle";
import { magicLinkSignature } from "./magicLink";

/** Set by the route handler from the trusted client IP (`clientIp`); a client-sent value is always replaced. */
export const CLIENT_IP_HEADER = "x-dialmade-client-ip";

/** Magic links live 10 minutes (the email says so). */
export const MAGIC_LINK_TTL_SECONDS = 10 * 60;

const DAY = 24 * 60 * 60;

/** Per IP (IPv6 grouped by /56, one customer site), in Better Auth's `rateLimit` table so every serverless instance shares it. */
export const RATE_LIMIT_RULES = {
  "/sign-in/magic-link": { window: 10 * 60, max: 5 },
  "/magic-link/verify": { window: 60, max: 10 },
  "/sign-in/social": { window: 60, max: 10 },
  "/sign-in/anonymous": { window: 60 * 60, max: 5 },
  "/passkey/*": { window: 60, max: 20 },
  "/get-session": { window: 60, max: 120 },
} as const;

/**
 * Set on the browser that asked for a magic link while signed in anonymously: «this device, this email».
 * Only then does verifying the link move the device's designs (see `onLinkAccount`): a link someone else
 * asked for, opened on this device, signs in but never takes its designs.
 */
export const LINK_INTENT_COOKIE = "dialmade.link_intent";

const intentValue = (anonymousId: string, email: string) => `${anonymousId}|${email.trim().toLowerCase()}`;

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
      encryptOAuthTokens: true,
    },
    databaseHooks: {
      user: {
        create: {
          // Every account has a proven email (magic link, or a provider that verified it). An unverified one
          // could be pre-registered by someone else and, with a passkey added, outlive the real owner's sign-in.
          before: async (user) => (user.isAnonymous === true || user.emailVerified === true ? undefined : false),
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/passkey/generate-register-options") {
          // Passkeys belong to real accounts with a proven email.
          const session = await getSessionFromCtx(ctx, { disableRefresh: true }).catch(() => null);
          const user = session?.user as { isAnonymous?: boolean; emailVerified?: boolean } | undefined;
          if (!user || user.isAnonymous || !user.emailVerified) throw APIError.from("FORBIDDEN", { code: "PASSKEY_NOT_ALLOWED", message: "Passkeys need an account with a verified email" });
        }
      }),
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
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER], ipv6Subnet: 56 },
    },
    plugins: [
      magicLink({
        expiresIn: MAGIC_LINK_TTL_SECONDS,
        storeToken: "hashed",
        sendMagicLink: async ({ email: to, url, token, metadata }, ctx) => {
          if (!(await takeMagicLinkSend(db, to, config.secret))) throw APIError.from("TOO_MANY_REQUESTS", { code: "TOO_MANY_EMAILS", message: "Too many links for now" });
          // Asked from an anonymous device: remember «this device, this email» for `onLinkAccount`.
          const session = ctx ? await getSessionFromCtx(ctx, { disableRefresh: true }).catch(() => null) : null;
          if (ctx && session?.user && (session.user as { isAnonymous?: boolean }).isAnonymous) {
            await ctx.setSignedCookie(LINK_INTENT_COOKIE, intentValue(session.user.id, to), ctx.context.secret, {
              httpOnly: true,
              sameSite: "lax",
              secure: config.production,
              path: "/api/auth",
              maxAge: MAGIC_LINK_TTL_SECONDS,
            });
          }
          // The link carries its email, signed: /login/confirm shows «Vas a entrar como …» before anything happens.
          const link = new URL(url);
          link.searchParams.set("email", to);
          link.searchParams.set("sig", magicLinkSignature(config.secret, token, to));
          try {
            await email.send(magicLinkEmail(to, link.toString(), metadata?.locale));
          } catch (error) {
            console.error("[auth] the magic link email was not sent:", (error as Error).message);
            throw APIError.from("INTERNAL_SERVER_ERROR", { code: "EMAIL_NOT_SENT", message: "The email could not be sent" });
          }
        },
      }),
      anonymous({
        generateName: () => "Dialmade",
        // Deleting the anonymous user is ours: only when its designs really moved (below).
        disableDeleteAnonymousUser: true,
        onLinkAccount: async ({ anonymousUser, newUser, ctx }) => {
          const anonymousId = anonymousUser.user.id;
          // OAuth (state bound to this browser) and passkeys happen on this device. A magic link may not: it moves
          // the designs only if this device asked for it with this email (LINK_INTENT_COOKIE). Otherwise the
          // anonymous user and its designs are left alone (purged later), never handed to that account.
          if (ctx.path === "/magic-link/verify") {
            const intent = await ctx.getSignedCookie(LINK_INTENT_COOKIE, ctx.context.secret).catch(() => null);
            if (intent !== intentValue(anonymousId, newUser.user.email)) return;
          }
          const moved = await designs.transferAll(anonymousId, newUser.user.id, limitsFor({ isAnonymous: false }));
          if (moved > 0 || (await designs.count(anonymousId)) === 0) await ctx.context.internalAdapter.deleteUser(anonymousId);
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
