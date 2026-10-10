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
  return new Request(request, { headers });
}

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
