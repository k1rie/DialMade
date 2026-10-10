// Better Auth: /api/auth/* (magic link, OAuth callbacks, passkeys, anonymous, session). Off without
// DATABASE_URL (503): the app keeps working without accounts.
import { connection } from "next/server";
import { getAuth } from "@/lib/auth/auth";
import { withClientIp } from "@/lib/auth/server";

const off = () => Response.json({ code: "auth-not-configured", message: "Accounts are not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });

async function handle(request: Request): Promise<Response> {
  // Read at request time: never prerendered or cached.
  await connection();
  const auth = getAuth();
  return auth ? auth.handler(withClientIp(request)) : off();
}

export const GET = handle;
export const POST = handle;
