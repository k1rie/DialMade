// Tests only: a real Postgres in memory (PGlite, WASM) behind the small part of `pg.Pool` that Kysely's
// PostgresDialect uses. No network, no DATABASE_URL.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Kysely, PostgresDialect } from "kysely";
import type { Database } from "./schema";

type QueryResult = { rows: unknown[]; rowCount: number; command: string };
type PoolClientLike = { query: (sql: string, params?: readonly unknown[]) => Promise<QueryResult>; release: () => void };

export type TestDatabase = {
  pglite: PGlite;
  /** What Kysely's PostgresDialect needs of a `pg.Pool`. */
  pool: { connect: () => Promise<PoolClientLike>; end: () => Promise<void> };
  db: Kysely<Database>;
  close: () => Promise<void>;
};

const COMMAND = /^\s*(?:with\b[\s\S]*?\)\s*)?(insert|update|delete|merge|select)\b/i;

/**
 * One PGlite per call. Queries run one at a time (PGlite has a single connection): a client is handed out
 * after the previous one is released, so Kysely transactions keep their statements together.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const pglite = new PGlite();
  // Supabase roles the migrations grant to / revoke from.
  await pglite.exec(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
    end $$;
  `);
  let queue: Promise<void> = Promise.resolve();
  const client = (): PoolClientLike => ({
    query: async (sql, params = []) => {
      const result = await pglite.query(sql, params as unknown[]);
      const command = (COMMAND.exec(sql)?.[1] ?? "").toUpperCase();
      return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length, command };
    },
    release: () => {},
  });
  const pool: TestDatabase["pool"] = {
    connect: () => {
      let release!: () => void;
      const turn = new Promise<void>((resolve) => (release = resolve));
      const ready = queue.then(() => ({ ...client(), release }));
      queue = queue.then(() => turn);
      return ready;
    },
    end: async () => {},
  };
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool: pool as never }) });
  return {
    pglite,
    pool,
    db,
    close: async () => {
      await db.destroy();
      await pglite.close();
    },
  };
}

const MIGRATIONS_DIR = fileURLToPath(new URL("../../../../../supabase/migrations/", import.meta.url));

/** Runs the SQL migrations whose file name contains `match` (all when omitted), in order. */
export async function applyMigrations(database: TestDatabase, match?: string): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql") && (!match || name.includes(match)))
    .sort();
  for (const name of files) await database.pglite.exec(readFileSync(MIGRATIONS_DIR + name, "utf8"));
}
