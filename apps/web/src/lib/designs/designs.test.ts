import { sql } from "kysely";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleDoc, sampleScreensDoc } from "@/lib/ai/testing";
import { applyMigrations, createTestDatabase, type TestDatabase } from "@/lib/db/testing";
import { createDesignsHandlers, type SessionUser } from "./handlers";
import { createDesignRepository, escapeLike, type DesignRepository } from "./repository";
import { MAX_DOC_BYTES, cleanDesignName, prepareDesign, readStoredDoc, type DesignLimits } from "./serialize";

vi.setConfig({ testTimeout: 30_000 });

const ORIGIN = "http://localhost:3700";
const A: SessionUser = { id: "user-a", isAnonymous: false };
const B: SessionUser = { id: "user-b", isAnonymous: false };

const L = (maxDesigns: number, maxBytes = 25_000_000): DesignLimits => ({ maxDesigns, maxBytes });

let database: TestDatabase;
let repo: DesignRepository;

async function addUser(id: string, anonymous = false) {
  await sql`insert into dialmade_auth."user" ("id", "name", "email", "emailVerified", "isAnonymous") values (${id}, ${id}, ${`${id}@example.com`}, true, ${anonymous})`.execute(database.db);
}

const prepared = (doc: unknown = sampleDoc(["landing"])) => {
  const result = prepareDesign(doc);
  if (!result.ok) throw new Error(result.message);
  return result.design;
};

beforeEach(async () => {
  database = await createTestDatabase();
  await applyMigrations(database);
  repo = createDesignRepository(database.db);
  await addUser(A.id);
  await addUser(B.id);
});
afterEach(async () => {
  await database.close();
});

describe("serialization", () => {
  it("a saved DesignDoc v2 comes back identical", async () => {
    const doc = sampleScreensDoc();
    const created = await repo.create(A.id, "Brisa", prepared(doc), L(10));
    if (!created.ok) throw new Error("not created");
    const loaded = await repo.get(A.id, created.design.id);
    expect(loaded?.doc).toEqual(prepared(doc).doc);
    expect(loaded?.doc.version).toBe(2);
    expect(loaded?.preview.screens).toBe(doc.screenOrder.length);
    expect(loaded?.preview.primary).toBe("#7c5cff");
    expect(loaded?.preview.swatches.length).toBeGreaterThan(0);
    expect(loaded?.sizeBytes).toBe(Buffer.byteLength(JSON.stringify(loaded?.doc)));
  });

  it("migrates a stored v1 document when it is read", () => {
    const v2 = sampleDoc(["landing"]);
    const v1: Record<string, unknown> = { ...v2, version: 1 };
    delete v1.screens;
    delete v1.screenOrder;
    const read = readStoredDoc(JSON.stringify(v1));
    expect(read?.version).toBe(2);
    expect(read?.screenOrder).toEqual([]);
  });

  it("refuses what is not a DesignDoc, and documents over the size limit", () => {
    expect(prepareDesign({ hello: "world" })).toMatchObject({ ok: false, reason: "invalid-document" });
    expect(prepareDesign("<script>")).toMatchObject({ ok: false, reason: "invalid-document" });
    const huge = { ...sampleDoc(["landing"]), brand: { ...sampleDoc(["landing"]).brand, tagline: "x".repeat(MAX_DOC_BYTES) } };
    expect(prepareDesign(huge)).toMatchObject({ ok: false, reason: "too-large" });
  });

  it("cleans names", () => {
    expect(cleanDesignName("  Mi\u0000 marca \n nueva ")).toBe("Mi marca nueva");
    expect(cleanDesignName("   ")).toBeNull();
    expect(cleanDesignName(42)).toBeNull();
    expect(cleanDesignName("a".repeat(500))).toHaveLength(120);
  });
});

describe("repository: one user never reaches another's designs", () => {
  it("B cannot list, read, rename, overwrite, duplicate or delete A's design", async () => {
    const created = await repo.create(A.id, "Secreto de A", prepared(), L(10));
    if (!created.ok) throw new Error("not created");
    const id = created.design.id;

    expect(await repo.list(B.id)).toEqual([]);
    expect(await repo.get(B.id, id)).toBeNull();
    expect(await repo.update(B.id, id, { name: "Mío" }, L(10))).toEqual({ ok: false, reason: "not-found" });
    expect(await repo.update(B.id, id, { design: prepared(sampleDoc(["app"])) }, L(10))).toEqual({ ok: false, reason: "not-found" });
    expect(await repo.duplicate(B.id, id, "Copia", L(10))).toBeNull();
    expect(await repo.remove(B.id, id)).toBe(false);
    expect(await repo.transferAll(B.id, A.id, L(10))).toBe(0);

    const intact = await repo.get(A.id, id);
    expect(intact?.name).toBe("Secreto de A");
    expect(await repo.list(B.id)).toEqual([]);
    expect(await repo.count(A.id)).toBe(1);
  });

  it("A can rename, duplicate and delete its own", async () => {
    const created = await repo.create(A.id, "Brisa", prepared(), L(10));
    if (!created.ok) throw new Error("not created");
    const renamed = await repo.update(A.id, created.design.id, { name: "Brisa 2" }, L(10));
    expect(renamed).toMatchObject({ ok: true, design: { name: "Brisa 2" } });
    const copy = await repo.duplicate(A.id, created.design.id, "Brisa (copia)", L(10));
    expect(copy).toMatchObject({ ok: true, design: { name: "Brisa (copia)" } });
    expect((await repo.list(A.id)).map((design) => design.name).sort()).toEqual(["Brisa (copia)", "Brisa 2"]);
    expect(await repo.remove(A.id, created.design.id)).toBe(true);
    expect(await repo.get(A.id, created.design.id)).toBeNull();
  });

  it("searches by name with % and _ taken literally, and sorts", async () => {
    for (const name of ["Zeta", "alfa 100%", "Beta_x", "betaxx"]) await repo.create(A.id, name, prepared(), L(10));
    expect((await repo.list(A.id, { query: "100%" })).map((design) => design.name)).toEqual(["alfa 100%"]);
    expect((await repo.list(A.id, { query: "beta_" })).map((design) => design.name)).toEqual(["Beta_x"]);
    expect((await repo.list(A.id, { sort: "name" })).map((design) => design.name)).toEqual(["alfa 100%", "Beta_x", "betaxx", "Zeta"]);
    expect(escapeLike("a%b_c\\")).toBe("a\\%b\\_c\\\\");
  });

  it("enforces the per-user limit, also on duplicate", async () => {
    const first = await repo.create(A.id, "1", prepared(), L(2));
    await repo.create(A.id, "2", prepared(), L(2));
    expect(await repo.create(A.id, "3", prepared(), L(2))).toEqual({ ok: false, reason: "limit" });
    if (!first.ok) throw new Error("not created");
    expect(await repo.duplicate(A.id, first.design.id, "copy", L(2))).toEqual({ ok: false, reason: "limit" });
    // B's shelf is separate.
    expect((await repo.create(B.id, "b", prepared(), L(2))).ok).toBe(true);
  });

  it("enforces the storage quota on create, update and duplicate", async () => {
    const design = prepared();
    const room = L(10, design.sizeBytes * 2 + 10);
    const first = await repo.create(A.id, "1", design, room);
    await repo.create(A.id, "2", design, room);
    expect(await repo.create(A.id, "3", design, room)).toEqual({ ok: false, reason: "quota" });
    if (!first.ok) throw new Error("not created");
    expect(await repo.duplicate(A.id, first.design.id, "copy", room)).toEqual({ ok: false, reason: "quota" });
    // Replacing a document counts without the old one.
    expect((await repo.update(A.id, first.design.id, { design }, room)).ok).toBe(true);
    const bigger = prepared(sampleScreensDoc());
    expect(await repo.update(A.id, first.design.id, { design: bigger }, L(10, design.sizeBytes + bigger.sizeBytes - 1))).toEqual({ ok: false, reason: "quota" });
  });

  it("moving a device's designs respects the account's limits (newest first)", async () => {
    await addUser("anon-x", true);
    for (const name of ["old", "mid", "new"]) {
      await repo.create("anon-x", name, prepared(), L(20));
      await sql`select pg_sleep(0.01)`.execute(database.db);
    }
    await repo.create(A.id, "mine", prepared(), L(10));
    expect(await repo.transferAll("anon-x", A.id, L(3))).toBe(2);
    expect((await repo.list(A.id)).map((design) => design.name).sort()).toEqual(["mid", "mine", "new"]);
    expect((await repo.list("anon-x")).map((design) => design.name)).toEqual(["old"]);
  });

  it("ids that are not uuids are just «not found»", async () => {
    expect(await repo.get(A.id, "1 or 1=1")).toBeNull();
    expect(await repo.remove(A.id, "../../etc")).toBe(false);
  });

  it("deleting the user deletes their designs", async () => {
    await repo.create(A.id, "Brisa", prepared(), L(10));
    await sql`delete from dialmade_auth."user" where id = ${A.id}`.execute(database.db);
    expect(await repo.list(A.id)).toEqual([]);
  });
});

describe("HTTP handlers", () => {
  const sessions = new Map<string, SessionUser>([
    ["token-a", A],
    ["token-b", B],
  ]);
  const handlers = () =>
    createDesignsHandlers({
      repo,
      trustedOrigins: [ORIGIN],
      getUser: async (request) => sessions.get(request.headers.get("cookie")?.replace("session=", "") ?? "") ?? null,
    });
  const req = (path: string, init: { method?: string; as?: string; body?: unknown; origin?: string | null; site?: string; type?: string } = {}) => {
    const headers = new Headers();
    if (init.as) headers.set("cookie", `session=${init.as}`);
    if (init.origin !== null) headers.set("origin", init.origin ?? ORIGIN);
    if (init.site) headers.set("sec-fetch-site", init.site);
    if (init.body !== undefined) headers.set("content-type", init.type ?? "application/json");
    return new Request(`${ORIGIN}${path}`, { method: init.method ?? "GET", headers, ...(init.body !== undefined && { body: JSON.stringify(init.body) }) });
  };

  it("A saves; B gets 404 on every route for A's id", async () => {
    const h = handlers();
    const saved = await h.create(req("/api/designs", { method: "POST", as: "token-a", body: { name: "Brisa", doc: sampleDoc(["landing"]) } }));
    expect(saved.status).toBe(201);
    const { design } = (await saved.json()) as { design: { id: string } };

    expect((await h.get(req(`/api/designs/${design.id}`, { as: "token-b" }), design.id)).status).toBe(404);
    expect((await h.update(req(`/api/designs/${design.id}`, { method: "PATCH", as: "token-b", body: { name: "x" } }), design.id)).status).toBe(404);
    expect((await h.duplicate(req(`/api/designs/${design.id}/duplicate`, { method: "POST", as: "token-b", body: { name: "x" } }), design.id)).status).toBe(404);
    expect((await h.remove(req(`/api/designs/${design.id}`, { method: "DELETE", as: "token-b" }), design.id)).status).toBe(404);
    const listB = (await (await h.list(req("/api/designs", { as: "token-b" }))).json()) as { designs: unknown[] };
    expect(listB.designs).toEqual([]);

    const own = await h.get(req(`/api/designs/${design.id}`, { as: "token-a" }), design.id);
    expect(own.status).toBe(200);
    expect(own.headers.get("cache-control")).toContain("no-store");
    expect(((await own.json()) as { design: { doc: { version: number } } }).design.doc.version).toBe(2);
  });

  it("needs a session", async () => {
    const h = handlers();
    expect((await h.list(req("/api/designs"))).status).toBe(401);
    expect((await h.create(req("/api/designs", { method: "POST", body: { name: "x", doc: {} } }))).status).toBe(401);
  });

  it("refuses cross-site writes and non-JSON bodies (CSRF)", async () => {
    const h = handlers();
    const body = { name: "Brisa", doc: sampleDoc(["landing"]) };
    expect((await h.create(req("/api/designs", { method: "POST", as: "token-a", body, origin: "https://evil.example" }))).status).toBe(403);
    expect((await h.create(req("/api/designs", { method: "POST", as: "token-a", body, site: "cross-site" }))).status).toBe(403);
    expect((await h.create(req("/api/designs", { method: "POST", as: "token-a", body, site: "same-site" }))).status).toBe(403);
    expect((await h.create(req("/api/designs", { method: "POST", as: "token-a", body, type: "text/plain" }))).status).toBe(415);
    expect((await h.remove(req("/api/designs/x", { method: "DELETE", as: "token-a", origin: "https://evil.example" }), "x")).status).toBe(403);
    expect(await repo.count(A.id)).toBe(0);
  });

  it("validates the document and the name, and reports the limit", async () => {
    const h = handlers();
    expect((await h.create(req("/api/designs", { method: "POST", as: "token-a", body: { name: "x", doc: { version: 2 } } }))).status).toBe(400);
    expect((await h.create(req("/api/designs", { method: "POST", as: "token-a", body: { name: " ", doc: sampleDoc() } }))).status).toBe(400);
    const anonymous: SessionUser = { id: "anon-1", isAnonymous: true };
    await addUser(anonymous.id, true);
    sessions.set("token-anon", anonymous);
    for (let i = 0; i < 20; i += 1) await repo.create(anonymous.id, `d${i}`, prepared(), L(20));
    const full = await h.create(req("/api/designs", { method: "POST", as: "token-anon", body: { name: "one more", doc: sampleDoc() } }));
    expect(full.status).toBe(409);
    expect(await full.json()).toMatchObject({ code: "limit", max: 20 });
  });

  it("limits writes per user (429) when asked to", async () => {
    let left = 2;
    const h = createDesignsHandlers({ repo, trustedOrigins: [ORIGIN], getUser: async () => A, allowWrite: async () => left-- > 0 });
    const save = () => h.create(req("/api/designs", { method: "POST", as: "token-a", body: { name: "x", doc: sampleDoc() } }));
    expect((await save()).status).toBe(201);
    expect((await save()).status).toBe(201);
    const third = await save();
    expect(third.status).toBe(429);
    expect(await third.json()).toMatchObject({ code: "rate-limited" });
  });

  it("stops reading a chunked body past the limit", async () => {
    const h = handlers();
    let pulled = 0;
    const chunk = new TextEncoder().encode("x".repeat(256 * 1024));
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        if (pulled > 100) controller.close();
        else controller.enqueue(chunk);
      },
    });
    const request = new Request(`${ORIGIN}/api/designs`, {
      method: "POST",
      headers: { cookie: "session=token-a", origin: ORIGIN, "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit);
    const response = await h.create(request);
    expect(response.status).toBe(413);
    expect(pulled).toBeLessThan(20);
  });

  it("PATCH updates the document of one's own design", async () => {
    const h = handlers();
    const created = await repo.create(A.id, "Brisa", prepared(), L(10));
    if (!created.ok) throw new Error("not created");
    const next = sampleDoc(["app"]);
    const response = await h.update(req(`/api/designs/${created.design.id}`, { method: "PATCH", as: "token-a", body: { doc: next } }), created.design.id);
    expect(response.status).toBe(200);
    const stored = await repo.get(A.id, created.design.id);
    expect(Object.keys(stored!.doc.pages)).toEqual(Object.keys(next.pages));
  });
});
