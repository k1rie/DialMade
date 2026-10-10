// Shared by server and client. Where a sign-in may send the user back to: a path of this app, never
// another origin. Better Auth checks callbackURL against trustedOrigins too; this is the first gate, for
// `?next=` on /login and for what the UI hands to Better Auth.

const FALLBACK = "/";

/**
 * `value` when it is a same-origin path (`/designs?q=a`), else `fallback`. Refuses absolute URLs,
 * protocol-relative `//host`, backslash tricks (`/\host`), control characters and anything that would
 * resolve to another origin.
 */
export function safeCallbackPath(value: unknown, fallback = FALLBACK): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  // Encoded slashes and backslashes in the path could turn into `//host` after decoding somewhere else.
  if (/%2f|%5c/i.test(value.split(/[?#]/)[0]!)) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const base = "https://dialmade.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    // Better Auth's own endpoints are not destinations.
    if (url.pathname.startsWith("/api/")) return fallback;
    // `/.//evil.com` normalizes to `//evil.com`: a protocol-relative URL is never a path of this app.
    if (url.pathname.startsWith("//")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
