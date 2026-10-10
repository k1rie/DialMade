// Server only: reads ANTHROPIC_API_KEY and DIALMADE_DEVICE_ID_SECRET. Never import it from client code.
import {
  DEFAULT_AI_EFFORT,
  DEFAULT_AI_MODEL,
  DEFAULT_FREE_USES_PER_MONTH,
  DEFAULT_MAX_REQUESTS_PER_IP_PER_DAY,
  DEFAULT_MONTHLY_BUDGET_USD,
  isAiEffort,
  type AiEffort,
} from "./config";
import { MIN_DEVICE_SECRET_LENGTH } from "./device";

/** Platforms where a per-process ledger is per instance and resets on cold starts. */
const SERVERLESS_ENV = ["VERCEL", "AWS_LAMBDA_FUNCTION_NAME", "NETLIFY", "FUNCTIONS_WORKER_RUNTIME", "K_SERVICE"] as const;

export type Env = Readonly<Record<string, string | undefined>>;

export type AiServerConfig = {
  apiKey: string | undefined;
  /** DIALMADE_AI_MODEL: BYOK and «Copiar prompt para mi Claude». */
  model: string;
  /** DIALMADE_AI_FREE_MODEL, or `model` when empty: every hosted (free tier) call. */
  freeModel: string;
  effort: AiEffort;
  monthlyBudgetUsd: number;
  maxRequestsPerIpPerDay: number;
  freeUsesPerMonth: number;
  /** Signs the anonymous device cookie. `undefined` when unset or shorter than 32 characters. */
  deviceSecret: string | undefined;
  /** NODE_ENV === "production": the memory ledger and the per-process device secret are not allowed. */
  production: boolean;
  serverless: boolean;
};

/** Unset → `fallback`. Set but not a number ≥ 0 (a typo like «$1» or «-1») → 0, so the hosted AI fails closed. */
function nonNegative(env: Env, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  console.error(`[ai] ${name}="${raw}" is not a number ≥ 0: using 0 (hosted AI off)`);
  return 0;
}

function deviceSecret(env: Env): string | undefined {
  const secret = env.DIALMADE_DEVICE_ID_SECRET?.trim();
  if (!secret) return undefined;
  if (secret.length >= MIN_DEVICE_SECRET_LENGTH) return secret;
  console.error(`[ai] DIALMADE_DEVICE_ID_SECRET is shorter than ${MIN_DEVICE_SECRET_LENGTH} characters: ignored`);
  return undefined;
}

export function readAiServerConfig(env: Env = process.env): AiServerConfig {
  const effort = env.DIALMADE_AI_EFFORT?.trim();
  const model = env.DIALMADE_AI_MODEL?.trim() || DEFAULT_AI_MODEL;
  return {
    apiKey: env.ANTHROPIC_API_KEY?.trim() || undefined,
    model,
    freeModel: env.DIALMADE_AI_FREE_MODEL?.trim() || model,
    effort: isAiEffort(effort) ? effort : DEFAULT_AI_EFFORT,
    monthlyBudgetUsd: nonNegative(env, "DIALMADE_AI_MONTHLY_BUDGET_USD", DEFAULT_MONTHLY_BUDGET_USD),
    maxRequestsPerIpPerDay: Math.floor(nonNegative(env, "DIALMADE_AI_MAX_REQUESTS_PER_IP_PER_DAY", DEFAULT_MAX_REQUESTS_PER_IP_PER_DAY)),
    freeUsesPerMonth: Math.floor(nonNegative(env, "DIALMADE_AI_FREE_USES_PER_MONTH", DEFAULT_FREE_USES_PER_MONTH)),
    deviceSecret: deviceSecret(env),
    production: env.NODE_ENV === "production",
    serverless: SERVERLESS_ENV.some((name) => !!env[name]),
  };
}

/**
 * The client's address for the per-IP limit, never the client-controlled start of `x-forwarded-for`.
 * On Vercel, `x-real-ip` (set by the platform). Self-hosted, the entry added by the nearest trusted
 * proxy: `DIALMADE_TRUSTED_PROXY_HOPS` from the end. Next keeps an `x-forwarded-for` the client sent
 * when no proxy is in front, so in production the header is trusted only when that variable says how
 * many proxies there are; unset (or 0) every client shares one bucket. In development the default is 1.
 */
export function clientIp(headers: Headers, env: Env = process.env): string {
  if (env.VERCEL) return headers.get("x-real-ip")?.trim() || "unknown";
  const raw = env.DIALMADE_TRUSTED_PROXY_HOPS?.trim();
  const hops = raw ? Number(raw) : env.NODE_ENV === "production" ? 0 : 1;
  if (!Number.isInteger(hops) || hops <= 0) return "unknown";
  const chain = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return chain[chain.length - hops] ?? "unknown";
}
