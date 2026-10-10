// Server only: DATABASE_URL (Supabase's Postgres through the pooler). Never import it from client components.
// One `pg` pool per process, shared by Better Auth (schema `dialmade_auth`) and «Mis diseños» (`dialmade.designs`).
import { Kysely, PostgresDialect } from "kysely";
import { Pool, type PoolConfig } from "pg";
import type { Database } from "./schema";

type Env = Readonly<Record<string, string | undefined>>;

/** Schema of Better Auth's tables (user, session, account, verification, passkey, rateLimit). */
export const AUTH_SCHEMA = "dialmade_auth";

export type DatabaseConfig = {
  connectionString: string;
  /**
   * TLS: `verify` with the server's CA (DATABASE_SSL_CA; Supabase: Database settings → SSL), `no-verify`
   * (encrypted, certificate not checked: development, or production with DATABASE_SSL=no-verify) or `off`
   * (a database on this machine).
   */
  tls: { mode: "verify"; ca: string } | { mode: "no-verify" } | { mode: "off" };
  /** Connections per process. Serverless functions keep it small: the pooler multiplexes them. */
  max: number;
};

const logged = new Set<string>();
/** Configuration problems are logged once per process (the layout reads the config on every render). */
const logOnce = (message: string) => {
  if (logged.has(message)) return;
  logged.add(message);
  console.error(message);
};

const DEFAULT_POOL_MAX = 5;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const SERVERLESS_POOL_MAX = 2;

/** `null` when DATABASE_URL is missing or is not a Postgres URL (then it logs why, never the value). */
export function readDatabaseConfig(env: Env = process.env): DatabaseConfig | null {
  const raw = env.DATABASE_URL?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    logOnce("[db] DATABASE_URL is not a URL");
    return null;
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    logOnce("[db] DATABASE_URL must be a postgres:// connection string (Supabase → Connect → pooler), not the project URL");
    return null;
  }
  const production = env.NODE_ENV === "production";
  const ca = decodeCa(env.DATABASE_SSL_CA);
  const local = LOCAL_HOSTS.has(url.hostname);
  let tls: DatabaseConfig["tls"];
  if (ca) tls = { mode: "verify", ca };
  else if (local) tls = { mode: "off" };
  else if (!production || env.DATABASE_SSL?.trim() === "no-verify") tls = { mode: "no-verify" };
  else {
    logOnce("[db] production needs DATABASE_SSL_CA (Supabase: Database settings → SSL) or DATABASE_SSL=no-verify");
    return null;
  }
  // pg lets `sslmode` in the URL override the `ssl` option: the option decides.
  url.searchParams.delete("sslmode");
  const fromEnv = Number(env.DIALMADE_DB_POOL_MAX);
  const serverless = !!(env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME || env.NETLIFY);
  const max = Number.isInteger(fromEnv) && fromEnv > 0 ? fromEnv : serverless ? SERVERLESS_POOL_MAX : DEFAULT_POOL_MAX;
  return { connectionString: url.toString(), tls, max };
}

/** The CA as PEM, given as PEM or as base64 of the PEM (one line, easier in env dashboards). */
function decodeCa(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes("-----BEGIN")) return trimmed.replace(/\\n/g, "\n");
  const decoded = Buffer.from(trimmed, "base64").toString("utf8");
  return decoded.includes("-----BEGIN") ? decoded : undefined;
}

export const isDatabaseConfigured = (env: Env = process.env): boolean => readDatabaseConfig(env) !== null;

export function poolConfigFor(config: DatabaseConfig): PoolConfig {
  return {
    connectionString: config.connectionString,
    max: config.max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // A script (or a test) may exit while the pool sits idle.
    allowExitOnIdle: true,
    ssl: config.tls.mode === "verify" ? { ca: config.tls.ca, rejectUnauthorized: true } : config.tls.mode === "no-verify" ? { rejectUnauthorized: false } : false,
  };
}

const POOL_KEY = Symbol.for("dialmade.db.pool");
type PoolHost = typeof globalThis & { [POOL_KEY]?: { key: string; pool: Pool; db: Kysely<Database> } };

/** `{ pool, db }` for this process (cached across hot reloads), or `null` without DATABASE_URL. */
export function getDatabase(env: Env = process.env): { pool: Pool; db: Kysely<Database> } | null {
  const config = readDatabaseConfig(env);
  if (!config) return null;
  const host = globalThis as PoolHost;
  const key = `${config.connectionString}|${config.max}|${JSON.stringify(config.tls)}`;
  const cached = host[POOL_KEY];
  if (cached && cached.key === key) return cached;
  if (cached) void cached.pool.end().catch(() => {});
  const pool = new Pool(poolConfigFor(config));
  // An idle client that errors (pooler restart) must not crash the process.
  pool.on("error", (error) => console.error("[db] idle client error:", error.message));
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  host[POOL_KEY] = { key, pool, db };
  return host[POOL_KEY];
}
