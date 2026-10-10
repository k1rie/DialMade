// Server only. Glue between Next's route handlers and Better Auth.
import { clientIp } from "@/lib/ai/serverConfig";
import { CLIENT_IP_HEADER, getAuth, type DialmadeAuth } from "./auth";

type Env = Readonly<Record<string, string | undefined>>;

/**
 * The request with the trusted client IP in `x-dialmade-client-ip` (Better Auth's only IP header), so its
 * rate limit cannot be dodged with a forged `X-Forwarded-For`. A value the client sent is dropped. Without
 * a trusted IP (self-hosted with no proxy configured) the header is absent and Better Auth puts every
 * client in one shared bucket: stricter, never looser.
 */
export function withClientIp(request: Request, env: Env = process.env): Request {
  const headers = new Headers(request.headers);
  headers.delete(CLIENT_IP_HEADER);
  const ip = clientIp(request.headers, env);
  if (ip && ip !== "unknown") headers.set(CLIENT_IP_HEADER, ip);
  else if (env.NODE_ENV === "production" && !warnedNoIp) {
    warnedNoIp = true;
    console.error("[auth] no trusted client IP (set DIALMADE_TRUSTED_PROXY_HOPS behind a proxy): every client shares one rate-limit bucket");
  }
  // Rebuilt by hand: `new Request(nextRequest, init)` throws on Next's request class.
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return new Request(request.url, {
    method: request.method,
    headers,
    signal: request.signal,
    redirect: "manual",
    ...(hasBody && { body: request.body, duplex: "half" }),
  } as RequestInit);
}

/** The page that shows «Vas a entrar como …» before a magic link is used. */
export const MAGIC_LINK_CONFIRM_PATH = "/login/confirm";

/**
 * Checks in front of Better Auth. `null` lets the request through.
 * - A magic link is only used from /login/confirm (a same-origin click): opened from an email, a chat or another
 *   site it goes to that page first. Someone else's link cannot sign a visitor in unnoticed, and mail scanners
 *   that follow links do not burn the token. Browsers without Fetch Metadata pass with `confirmed=1`.
 * - POSTs from other sites (forms, scripts) are refused even without cookies: Better Auth only checks the Origin
 *   when cookies are present, which would let any site start an anonymous session for a visitor.
 */
export function guardAuthRequest(request: Request): Response | null {
  const url = new URL(request.url);
  const site = request.headers.get("sec-fetch-site")?.toLowerCase() ?? null;
  if (request.method === "GET" && url.pathname.endsWith("/magic-link/verify")) {
    const confirmed = url.searchParams.get("confirmed") === "1";
    if (site === "same-origin" || (site === null && confirmed)) return null;
    url.searchParams.delete("confirmed");
    return new Response(null, { status: 303, headers: { Location: `${MAGIC_LINK_CONFIRM_PATH}${url.search}`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  }
  if (request.method === "POST" && (site === "cross-site" || site === "same-site")) {
    return Response.json({ code: "FORBIDDEN", message: "Cross-site requests are not allowed" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  return null;
}

let warnedNoIp = false;

export type SessionUser = { id: string; isAnonymous: boolean; name: string; email: string; image: string | null };

/** The signed-in user (anonymous devices included), or `null`. Never throws: a database error is «no session». */
export async function getSessionUser(request: Request | Headers, auth: DialmadeAuth | null = getAuth()): Promise<SessionUser | null> {
  if (!auth) return null;
  try {
    const session = await auth.api.getSession({ headers: request instanceof Headers ? request : request.headers });
    if (!session) return null;
    const user = session.user as typeof session.user & { isAnonymous?: boolean | null };
    return { id: user.id, isAnonymous: !!user.isAnonymous, name: user.name, email: user.email, image: user.image ?? null };
  } catch (error) {
    console.error("[auth] session lookup failed:", (error as Error).message);
    return null;
  }
}
