import { STATUS_ENDPOINT } from "@/lib/ai/api";
import { OFFLINE_AI_STATUS } from "@/lib/ai/policy";

/** Why a request was refused inside /promo (thrown as the fetch's TypeError message). */
export const BLOCKED_MESSAGE = "Blocked by /promo: captures run without network or AI";

/**
 * Keeps /promo offline and deterministic: `GET /api/ai/status` answers the fixed «AI off» status
 * (the Composer's AI menu and meter render as without AI), any other `/api/*` call and any other
 * origin are refused. The app's own assets (same-origin, blob: and data: URLs) go through.
 * Returns the function that restores the original `fetch`.
 */
export function installFetchGuard(target: { fetch: typeof fetch; location: { href: string; origin: string } } = window): () => void {
  const original = target.fetch;
  const guarded: typeof fetch = (input, init) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, target.location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return original.call(target, input, init);
    if (url.origin === target.location.origin) {
      if (url.pathname === STATUS_ENDPOINT) {
        return Promise.resolve(
          new Response(JSON.stringify(OFFLINE_AI_STATUS), { status: 200, headers: { "content-type": "application/json" } }),
        );
      }
      if (!url.pathname.startsWith("/api/")) return original.call(target, input, init);
    }
    return Promise.reject(new TypeError(`${BLOCKED_MESSAGE} (${url.origin}${url.pathname})`));
  };
  target.fetch = guarded;
  return () => {
    if (target.fetch === guarded) target.fetch = original;
  };
}
