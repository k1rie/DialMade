// Server only. HTTP side of «Mis diseños» (/api/designs…), independent of Next and of Better Auth so tests
// can drive it: `getUser` resolves the session, the repository does the rest. Every handler:
// - needs a session (401 without one) and passes its user id to the repository, which filters by it;
// - answers 404 for a design that is missing OR belongs to someone else (indistinguishable on purpose);
// - on writes, refuses other origins (CSRF: Origin must be a trusted origin, Sec-Fetch-Site same-origin)
//   and anything but JSON (a cross-site form or no-cors POST cannot send application/json without CORS).
import type { DesignRepository, DesignSort } from "./repository";
import { MAX_DESIGNS_ANONYMOUS, MAX_DESIGNS_PER_USER, MAX_DOC_BYTES, cleanDesignName, prepareDesign } from "./serialize";

export type SessionUser = { id: string; isAnonymous: boolean };

export type DesignsErrorCode =
  | "unauthenticated"
  | "forbidden-origin"
  | "unsupported-media-type"
  | "invalid-request"
  | "invalid-document"
  | "too-large"
  | "limit"
  | "not-found"
  | "unavailable";

export type DesignsError = { code: DesignsErrorCode; message: string; max?: number };

export type DesignsHandlerDeps = {
  getUser: (request: Request) => Promise<SessionUser | null>;
  repo: DesignRepository;
  /** Origins allowed to write (Better Auth's trusted origins). */
  trustedOrigins: readonly string[];
};

const NO_STORE = { "Cache-Control": "no-store, private" };
/** JSON overhead on top of the document (name, wrapper). */
const BODY_SLACK = 16 * 1024;

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });
const fail = (status: number, code: DesignsErrorCode, message: string, extra: Partial<DesignsError> = {}) => json({ code, message, ...extra } satisfies DesignsError, status);

export const maxDesignsFor = (user: SessionUser) => (user.isAnonymous ? MAX_DESIGNS_ANONYMOUS : MAX_DESIGNS_PER_USER);

/** `null` when a write may go on; otherwise the 403/415 to send. */
export function rejectUnsafeWrite(request: Request, trustedOrigins: readonly string[], { body }: { body: boolean }): Response | null {
  const site = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (site && site !== "same-origin" && site !== "none") return fail(403, "forbidden-origin", "Cross-site requests are not allowed");
  const origin = request.headers.get("origin");
  if (origin !== null && !trustedOrigins.includes(origin)) return fail(403, "forbidden-origin", "Origin not allowed");
  if (body) {
    const type = (request.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
    if (type !== "application/json") return fail(415, "unsupported-media-type", "Expected Content-Type: application/json");
  }
  return null;
}

/** The JSON body, or a 400/413 response. Bodies over the document limit are refused before parsing. */
async function readBody(request: Request): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; response: Response }> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_DOC_BYTES + BODY_SLACK) return { ok: false, response: fail(413, "too-large", "Body too large") };
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_DOC_BYTES + BODY_SLACK) return { ok: false, response: fail(413, "too-large", "Body too large") };
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value)) return { ok: true, value: value as Record<string, unknown> };
  } catch {}
  return { ok: false, response: fail(400, "invalid-request", "Expected a JSON object") };
}

export function createDesignsHandlers({ getUser, repo, trustedOrigins }: DesignsHandlerDeps) {
  /** Session (and, for writes, origin and media type) first; then the handler. */
  const guarded =
    <A extends unknown[]>(write: false | "body" | "no-body", run: (user: SessionUser, request: Request, ...args: A) => Promise<Response>) =>
    async (request: Request, ...args: A): Promise<Response> => {
      if (write) {
        const rejected = rejectUnsafeWrite(request, trustedOrigins, { body: write === "body" });
        if (rejected) return rejected;
      }
      const user = await getUser(request);
      if (!user) return fail(401, "unauthenticated", "Sign in first");
      try {
        return await run(user, request, ...args);
      } catch (error) {
        console.error("[designs] request failed:", (error as Error).message);
        return fail(503, "unavailable", "Try again later");
      }
    };

  return {
    /** GET /api/designs?q=&sort=recent|name */
    list: guarded(false, async (user, request) => {
      const params = new URL(request.url).searchParams;
      const sort: DesignSort = params.get("sort") === "name" ? "name" : "recent";
      const designs = await repo.list(user.id, { query: params.get("q") ?? undefined, sort });
      return json({ designs, max: maxDesignsFor(user), anonymous: user.isAnonymous });
    }),

    /** POST /api/designs { name, doc } */
    create: guarded("body", async (user, request) => {
      const body = await readBody(request);
      if (!body.ok) return body.response;
      const name = cleanDesignName(body.value.name);
      if (!name) return fail(400, "invalid-request", "A name is required");
      const prepared = prepareDesign(body.value.doc);
      if (!prepared.ok) return fail(prepared.reason === "too-large" ? 413 : 400, prepared.reason, prepared.message);
      const max = maxDesignsFor(user);
      const created = await repo.create(user.id, name, prepared.design, { maxDesigns: max });
      if (!created.ok) return fail(409, "limit", "Design limit reached", { max });
      return json({ design: created.design }, 201);
    }),

    /** GET /api/designs/:id → the design with its document. */
    get: guarded(false, async (user, _request, id: string) => {
      const design = await repo.get(user.id, id);
      return design ? json({ design }) : fail(404, "not-found", "Not found");
    }),

    /** PATCH /api/designs/:id { name?, doc? } */
    update: guarded("body", async (user, request, id: string) => {
      const body = await readBody(request);
      if (!body.ok) return body.response;
      const changes: Parameters<DesignRepository["update"]>[2] = {};
      if ("name" in body.value) {
        const name = cleanDesignName(body.value.name);
        if (!name) return fail(400, "invalid-request", "Invalid name");
        changes.name = name;
      }
      if ("doc" in body.value) {
        const prepared = prepareDesign(body.value.doc);
        if (!prepared.ok) return fail(prepared.reason === "too-large" ? 413 : 400, prepared.reason, prepared.message);
        changes.design = prepared.design;
      }
      if (changes.name === undefined && !changes.design) return fail(400, "invalid-request", "Nothing to change");
      const design = await repo.update(user.id, id, changes);
      return design ? json({ design }) : fail(404, "not-found", "Not found");
    }),

    /** POST /api/designs/:id/duplicate { name } */
    duplicate: guarded("body", async (user, request, id: string) => {
      const body = await readBody(request);
      if (!body.ok) return body.response;
      const name = cleanDesignName(body.value.name);
      if (!name) return fail(400, "invalid-request", "A name is required");
      const max = maxDesignsFor(user);
      const result = await repo.duplicate(user.id, id, name, { maxDesigns: max });
      if (!result) return fail(404, "not-found", "Not found");
      if (!result.ok) return fail(409, "limit", "Design limit reached", { max });
      return json({ design: result.design }, 201);
    }),

    /** DELETE /api/designs/:id */
    remove: guarded("no-body", async (user, _request, id: string) => {
      const removed = await repo.remove(user.id, id);
      return removed ? json({ ok: true }) : fail(404, "not-found", "Not found");
    }),
  };
}

export type DesignsHandlers = ReturnType<typeof createDesignsHandlers>;
