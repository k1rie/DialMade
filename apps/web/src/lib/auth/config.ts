// Server only. Reads the auth configuration from the environment. Secrets (BETTER_AUTH_SECRET, DATABASE_URL,
// OAuth secrets, email keys) never leave this module except to Better Auth; `authAvailability` is the only
// part that reaches the browser, and it holds booleans.
import { randomBytes } from "node:crypto";
import { isDatabaseConfigured } from "@/lib/db/database";
import type { AuthAvailability } from "./availability";

type Env = Readonly<Record<string, string | undefined>>;

/** Shorter secrets are refused (`openssl rand -base64 32` gives 44 characters). */
export const MIN_AUTH_SECRET_LENGTH = 32;
/** `pnpm dev` of this repo. */
export const DEV_BASE_URL = "http://localhost:3700";

export type OAuthCredentials = { clientId: string; clientSecret: string };

export type EmailTransportConfig =
  | { kind: "console" }
  | { kind: "resend"; apiKey: string; from: string }
  | { kind: "smtp"; url: string; from: string };

export type BillingConfig = { stripeSecretKey: string; stripeWebhookSecret: string };

export type AuthServerConfig = {
  secret: string;
  /** Origin of the app (no trailing slash): Better Auth's baseURL, the passkey origin and the trusted origin. */
  baseURL: string;
  trustedOrigins: string[];
  production: boolean;
  github: OAuthCredentials | null;
  google: OAuthCredentials | null;
  /** `null`: no way to send the magic link (production without Resend/SMTP). */
  email: EmailTransportConfig | null;
  passkey: { rpID: string; rpName: string; origin: string };
  /** `null` unless DIALMADE_FEATURE_BILLING=true and the Stripe keys exist. Off by default. */
  billing: BillingConfig | null;
};

const trimmed = (env: Env, name: string): string | undefined => env[name]?.trim() || undefined;

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

function oauth(env: Env, id: string, secret: string): OAuthCredentials | null {
  const clientId = trimmed(env, id);
  const clientSecret = trimmed(env, secret);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

const DEV_SECRET_KEY = Symbol.for("dialmade.auth.devSecret");
type SecretHost = typeof globalThis & { [DEV_SECRET_KEY]?: string };

function secretFor(env: Env, production: boolean): string | null {
  const secret = trimmed(env, "BETTER_AUTH_SECRET");
  if (secret && secret.length >= MIN_AUTH_SECRET_LENGTH) return secret;
  if (secret) console.error(`[auth] BETTER_AUTH_SECRET is shorter than ${MIN_AUTH_SECRET_LENGTH} characters: ignored`);
  if (production) return null;
  // Development without a secret: one per process (sessions end on restart).
  const host = globalThis as SecretHost;
  return (host[DEV_SECRET_KEY] ??= randomBytes(32).toString("base64"));
}

function emailFor(env: Env, production: boolean): EmailTransportConfig | null {
  const from = trimmed(env, "DIALMADE_EMAIL_FROM");
  const forced = trimmed(env, "DIALMADE_EMAIL_TRANSPORT");
  if (forced === "console") return production ? null : { kind: "console" };
  const resendKey = trimmed(env, "RESEND_API_KEY");
  if (resendKey && from && forced !== "smtp") return { kind: "resend", apiKey: resendKey, from };
  const smtpUrl = trimmed(env, "SMTP_URL");
  if (smtpUrl && from) return { kind: "smtp", url: smtpUrl, from };
  if ((resendKey || smtpUrl) && !from) console.error("[auth] DIALMADE_EMAIL_FROM is missing: the email transport is off");
  // Development: the link goes to the server console. Production never prints it.
  return production ? null : { kind: "console" };
}

/**
 * The auth configuration, or `null` when auth is off: no DATABASE_URL, or production without
 * BETTER_AUTH_SECRET / an app URL. Without auth the app works the same, only without accounts.
 */
export function readAuthConfig(env: Env = process.env): AuthServerConfig | null {
  const production = env.NODE_ENV === "production";
  if (!isDatabaseConfigured(env)) return null;
  const secret = secretFor(env, production);
  if (!secret) return null;
  const baseURL = originOf(trimmed(env, "BETTER_AUTH_URL")) ?? originOf(trimmed(env, "NEXT_PUBLIC_APP_URL")) ?? (production ? null : DEV_BASE_URL);
  if (!baseURL) {
    console.error("[auth] BETTER_AUTH_URL (or NEXT_PUBLIC_APP_URL) is missing or not an http(s) URL: auth is off");
    return null;
  }
  if (production && !baseURL.startsWith("https://")) {
    console.error("[auth] the app URL must be https in production: auth is off");
    return null;
  }
  const extra = (trimmed(env, "BETTER_AUTH_TRUSTED_ORIGINS") ?? "")
    .split(",")
    .map((value) => originOf(value.trim()))
    .filter((value): value is string => value !== null);
  const dev = production ? [] : [DEV_BASE_URL, "http://127.0.0.1:3700"];
  const trustedOrigins = [...new Set([baseURL, ...extra, ...dev])];
  const stripeSecretKey = trimmed(env, "STRIPE_SECRET_KEY");
  const stripeWebhookSecret = trimmed(env, "STRIPE_WEBHOOK_SECRET");
  const billingOn = env.DIALMADE_FEATURE_BILLING?.trim() === "true";
  if (billingOn && !(stripeSecretKey && stripeWebhookSecret)) console.error("[auth] billing is on but the Stripe keys are missing: billing stays off");
  return {
    secret,
    baseURL,
    trustedOrigins,
    production,
    github: oauth(env, "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"),
    google: oauth(env, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
    email: emailFor(env, production),
    passkey: { rpID: new URL(baseURL).hostname, rpName: "Dialmade", origin: baseURL },
    billing: billingOn && stripeSecretKey && stripeWebhookSecret ? { stripeSecretKey, stripeWebhookSecret } : null,
  };
}

/** What the browser may know: which ways in exist. Never a secret. */
export function authAvailability(env: Env = process.env): AuthAvailability {
  const config = readAuthConfig(env);
  if (!config) return { enabled: false, magicLink: false, github: false, google: false, passkey: false, anonymous: false, devEmail: false };
  return {
    enabled: true,
    magicLink: config.email !== null,
    github: config.github !== null,
    google: config.google !== null,
    passkey: true,
    anonymous: true,
    devEmail: config.email?.kind === "console",
  };
}
