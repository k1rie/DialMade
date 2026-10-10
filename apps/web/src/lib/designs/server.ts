// Server only. The /api/designs handlers wired to Better Auth's session and the shared database.
import { getAuth } from "@/lib/auth/auth";
import { readAuthConfig } from "@/lib/auth/config";
import { getSessionUser } from "@/lib/auth/server";
import { getDatabase } from "@/lib/db/database";
import { createDesignsHandlers, type DesignsHandlers } from "./handlers";
import { createDesignRepository } from "./repository";

const HANDLERS_KEY = Symbol.for("dialmade.designs.handlers");
type Host = typeof globalThis & { [HANDLERS_KEY]?: { auth: unknown; handlers: DesignsHandlers } };

/** `null` when accounts are off: the routes answer 503 and the app keeps working without «Mis diseños». */
export function getDesignsHandlers(): DesignsHandlers | null {
  const auth = getAuth();
  const config = readAuthConfig();
  const database = getDatabase();
  if (!auth || !config || !database) return null;
  const host = globalThis as Host;
  if (host[HANDLERS_KEY]?.auth === auth) return host[HANDLERS_KEY].handlers;
  const handlers = createDesignsHandlers({
    getUser: (request) => getSessionUser(request, auth),
    repo: createDesignRepository(database.db),
    trustedOrigins: config.trustedOrigins,
  });
  host[HANDLERS_KEY] = { auth, handlers };
  return handlers;
}

export const designsUnavailable = () =>
  Response.json({ code: "unavailable", message: "Accounts are not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
