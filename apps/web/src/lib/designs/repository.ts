// Server only. «Mis diseños» in `dialmade.designs`. There is no RLS tied to Better Auth users, so the
// permission check IS this module: every query takes the signed-in `userId` and filters by it. A design of
// another user looks exactly like one that does not exist (no 403 that would confirm the id).
import { sql, type Kysely, type Transaction } from "kysely";
import type { Database, DesignPreview } from "@/lib/db/schema";
import type { DesignDoc } from "@dialmade/doc";
import { readStoredDoc, type DesignLimits, type PreparedDesign } from "./serialize";

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

/** `limit`: too many designs; `quota`: too many bytes. */
export type CreateResult = { ok: true; design: DesignSummary } | { ok: false; reason: "limit" | "quota" };
export type UpdateResult = { ok: true; design: DesignSummary } | { ok: false; reason: "not-found" | "quota" };

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

type Db = Kysely<Database> | Transaction<Database>;

export type DesignRepository = ReturnType<typeof createDesignRepository>;

export function createDesignRepository(db: Kysely<Database>) {
  const designs = "dialmade.designs" as const;

  /** Serializes the writes of one user that check its limits, so two tabs cannot pass them together. */
  const lockUser = (trx: Db, userId: string) => sql`select pg_advisory_xact_lock(hashtextextended(${`designs:${userId}`}, 0))`.execute(trx);

  /** How many designs and bytes the user has, optionally without one design (the one being replaced). */
  const usage = async (trx: Db, userId: string, except?: string) => {
    let query = trx
      .selectFrom(designs)
      .select((eb) => [eb.fn.countAll<string>().as("count"), eb.fn.coalesce(eb.fn.sum<string>("size_bytes"), sql<string>`0`).as("bytes")])
      .where("user_id", "=", userId);
    if (except) query = query.where("id", "!=", except);
    const row = await query.executeTakeFirstOrThrow();
    return { count: Number(row.count), bytes: Number(row.bytes) };
  };

  const insertFor = async (trx: Db, userId: string, name: string, design: Pick<PreparedDesign, "json" | "version" | "preview" | "sizeBytes">, limits: DesignLimits): Promise<CreateResult> => {
    await lockUser(trx, userId);
    const used = await usage(trx, userId);
    if (used.count >= limits.maxDesigns) return { ok: false, reason: "limit" };
    if (used.bytes + design.sizeBytes > limits.maxBytes) return { ok: false, reason: "quota" };
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
      return (await usage(db, userId)).count;
    },

    /** Designs and bytes stored by the user. */
    usage: (userId: string) => usage(db, userId),

    /** The design with its document (migrated). `null` when missing, someone else's, or no longer valid. */
    async get(userId: string, id: string): Promise<DesignRecord | null> {
      if (!isDesignId(id)) return null;
      const row = await db.selectFrom(designs).select([...SUMMARY_COLUMNS, "doc"]).where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
      if (!row) return null;
      const doc = readStoredDoc(row.doc);
      return doc ? { ...toSummary(row), doc } : null;
    },

    create(userId: string, name: string, design: PreparedDesign, limits: DesignLimits): Promise<CreateResult> {
      return db.transaction().execute((trx) => insertFor(trx, userId, name, design, limits));
    },

    /** Name and/or document. A new document must fit the user's storage with the old one replaced. */
    async update(userId: string, id: string, changes: { name?: string; design?: PreparedDesign }, limits: DesignLimits): Promise<UpdateResult> {
      if (!isDesignId(id)) return { ok: false, reason: "not-found" };
      return db.transaction().execute(async (trx): Promise<UpdateResult> => {
        if (changes.design) {
          await lockUser(trx, userId);
          const others = await usage(trx, userId, id);
          if (others.bytes + changes.design.sizeBytes > limits.maxBytes) {
            const exists = await trx.selectFrom(designs).select("id").where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
            return { ok: false, reason: exists ? "quota" : "not-found" };
          }
        }
        const row = await trx
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
        return row ? { ok: true, design: toSummary(row) } : { ok: false, reason: "not-found" };
      });
    },

    /** A copy owned by the same user. `null` when the source is not theirs. */
    async duplicate(userId: string, id: string, name: string, limits: DesignLimits): Promise<CreateResult | null> {
      if (!isDesignId(id)) return null;
      return db.transaction().execute(async (trx) => {
        const source = await trx.selectFrom(designs).select(["doc", "doc_version", "preview", "size_bytes"]).where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
        if (!source) return null;
        const json = typeof source.doc === "string" ? source.doc : JSON.stringify(source.doc);
        const preview = typeof source.preview === "string" ? (JSON.parse(source.preview) as DesignPreview) : source.preview;
        return insertFor(trx, userId, name, { json, version: source.doc_version, preview, sizeBytes: Number(source.size_bytes) }, limits);
      });
    },

    /** `true` when it was the user's and is gone. */
    async remove(userId: string, id: string): Promise<boolean> {
      if (!isDesignId(id)) return false;
      const result = await db.deleteFrom(designs).where("id", "=", id).where("user_id", "=", userId).executeTakeFirst();
      return Number(result.numDeletedRows) > 0;
    },

    /**
     * An anonymous device signed in: its designs move to the account, newest first, as many as fit the
     * account's limits (so linking many devices cannot grow an account past them). Returns how many moved;
     * the rest go away with the anonymous user.
     */
    async transferAll(fromUserId: string, toUserId: string, limits: DesignLimits): Promise<number> {
      if (fromUserId === toUserId) return 0;
      return db.transaction().execute(async (trx) => {
        await lockUser(trx, toUserId);
        const used = await usage(trx, toUserId);
        const slots = limits.maxDesigns - used.count;
        const room = limits.maxBytes - used.bytes;
        if (slots <= 0 || room <= 0) return 0;
        const { rows } = await sql<{ id: string }>`
          update dialmade.designs d
             set user_id = ${toUserId}
            from (
              select id, row_number() over (order by updated_at desc) as n,
                     sum(size_bytes) over (order by updated_at desc rows unbounded preceding) as bytes
                from dialmade.designs
               where user_id = ${fromUserId}
            ) pick
           where d.id = pick.id
             and d.user_id = ${fromUserId}
             and pick.n <= ${slots}
             and pick.bytes <= ${room}
          returning d.id
        `.execute(trx);
        return rows.length;
      });
    },
  };
}
