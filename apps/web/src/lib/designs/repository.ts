// Server only. «Mis diseños» in `dialmade.designs`. There is no RLS tied to Better Auth users, so the
// permission check IS this module: every query takes the signed-in `userId` and filters by it. A design of
// another user looks exactly like one that does not exist (no 403 that would confirm the id).
import { sql, type Kysely } from "kysely";
import type { Database, DesignPreview } from "@/lib/db/schema";
import type { DesignDoc } from "@dialmade/doc";
import { readStoredDoc, type PreparedDesign } from "./serialize";

export type DesignSummary = {
  id: string;
  name: string;
  preview: DesignPreview;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export type DesignRecord = DesignSummary & { doc: DesignDoc };

export type DesignSort = "recent" | "name";

export type ListOptions = { query?: string; sort?: DesignSort; limit?: number };

export type CreateResult = { ok: true; design: DesignSummary } | { ok: false; reason: "limit" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids come from the URL: anything that is not a uuid is simply «not found» (no SQL error). */
export const isDesignId = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

/** `%`, `_` and `\` are literal in a search. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const SUMMARY_COLUMNS = ["id", "name", "preview", "size_bytes", "created_at", "updated_at"] as const;

type SummaryRow = { id: string; name: string; preview: DesignPreview; size_bytes: number; created_at: Date; updated_at: Date };

const iso = (value: Date | string) => (value instanceof Date ? value : new Date(value)).toISOString();

function toSummary(row: SummaryRow): DesignSummary {
  return {
    id: row.id,
    name: row.name,
    preview: typeof row.preview === "string" ? (JSON.parse(row.preview) as DesignPreview) : row.preview,
    sizeBytes: Number(row.size_bytes),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export type DesignRepository = ReturnType<typeof createDesignRepository>;

export function createDesignRepository(db: Kysely<Database>) {
  const designs = "dialmade.designs" as const;

  /** Serializes creations of one user (count + insert), so two tabs cannot pass the limit together. */
  const lockUser = (trx: Kysely<Database>, userId: string) => sql`select pg_advisory_xact_lock(hashtextextended(${`designs:${userId}`}, 0))`.execute(trx);

  const insertFor = async (trx: Kysely<Database>, userId: string, name: string, design: Pick<PreparedDesign, "json" | "version" | "preview" | "sizeBytes">, maxDesigns: number): Promise<CreateResult> => {
    await lockUser(trx, userId);
    const { count } = await trx.selectFrom(designs).select((eb) => eb.fn.countAll<string>().as("count")).where("user_id", "=", userId).executeTakeFirstOrThrow();
    if (Number(count) >= maxDesigns) return { ok: false, reason: "limit" };
    const row = await trx
      .insertInto(designs)
      .values({
        user_id: userId,
        name,
        doc: design.json,
        doc_version: design.version,
        preview: JSON.stringify(design.preview),
        size_bytes: design.sizeBytes,
      })
      .returning(SUMMARY_COLUMNS)
      .executeTakeFirstOrThrow();
    return { ok: true, design: toSummary(row) };
  };

  return {
    async list(userId: string, options: ListOptions = {}): Promise<DesignSummary[]> {
      const limit = Math.min(Math.max(Math.floor(options.limit ?? 100), 1), 200);
      let query = db.selectFrom(designs).select(SUMMARY_COLUMNS).where("user_id", "=", userId);
      const text = options.query?.trim().slice(0, 120);
      if (text) query = query.where("name", "ilike", `%${escapeLike(text)}%`);
      query = options.sort === "name" ? query.orderBy(sql`lower(name)`).orderBy("updated_at", "desc") : query.orderBy("updated_at", "desc");
      const rows = await query.limit(limit).execute();
      return rows.map(toSummary);
    },

    async count(userId: string): Promise<number> {
      const { count } = await db.selectFrom(designs).select((eb) => eb.fn.countAll<string>().as("count")).where("user_id", "=", userId).executeTakeFirstOrThrow();
      return Number(count);
    },

    /** The design with its document (migrated). `null` when missing, someone else's, or no longer valid. */
    async get(userId: string, id: string): Promise<DesignRecord | null> {
      if (!isDesignId(id)) return null;
      const row = await db.selectFrom(designs).select([...SUMMARY_COLUMNS, "doc"]).where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
      if (!row) return null;
      const doc = readStoredDoc(row.doc);
      return doc ? { ...toSummary(row), doc } : null;
    },

    create(userId: string, name: string, design: PreparedDesign, options: { maxDesigns: number }): Promise<CreateResult> {
      return db.transaction().execute((trx) => insertFor(trx, userId, name, design, options.maxDesigns));
    },

    /** Name and/or document. `null` when it is not the user's. */
    async update(userId: string, id: string, changes: { name?: string; design?: PreparedDesign }): Promise<DesignSummary | null> {
      if (!isDesignId(id)) return null;
      const row = await db
        .updateTable(designs)
        .set({
          updated_at: new Date(),
          ...(changes.name !== undefined && { name: changes.name }),
          ...(changes.design && {
            doc: changes.design.json,
            doc_version: changes.design.version,
            preview: JSON.stringify(changes.design.preview),
            size_bytes: changes.design.sizeBytes,
          }),
        })
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .returning(SUMMARY_COLUMNS)
        .executeTakeFirst();
      return row ? toSummary(row) : null;
    },

    /** A copy owned by the same user. `null` when the source is not theirs. */
    async duplicate(userId: string, id: string, name: string, options: { maxDesigns: number }): Promise<CreateResult | null> {
      if (!isDesignId(id)) return null;
      return db.transaction().execute(async (trx) => {
        const source = await trx.selectFrom(designs).select(["doc", "doc_version", "preview", "size_bytes"]).where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
        if (!source) return null;
        const json = typeof source.doc === "string" ? source.doc : JSON.stringify(source.doc);
        const preview = typeof source.preview === "string" ? (JSON.parse(source.preview) as DesignPreview) : source.preview;
        return insertFor(trx, userId, name, { json, version: source.doc_version, preview, sizeBytes: Number(source.size_bytes) }, options.maxDesigns);
      });
    },

    /** `true` when it was the user's and is gone. */
    async remove(userId: string, id: string): Promise<boolean> {
      if (!isDesignId(id)) return false;
      const result = await db.deleteFrom(designs).where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
      return Number(result.numDeletedRows) > 0;
    },

    /**
     * An anonymous device signed in: its designs move to the account (all of them, even past the account's
     * limit, so nothing is lost). Returns how many moved.
     */
    async transferAll(fromUserId: string, toUserId: string): Promise<number> {
      if (fromUserId === toUserId) return 0;
      const result = await db.updateTable(designs).set({ user_id: toUserId }).where("user_id", "=", fromUserId).executeTakeFirst();
      return Number(result.numUpdatedRows);
    },
  };
}
