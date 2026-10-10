// The preview origin of «Diseño con IA» (spec §6.1): a SEPARATE origin (apps/preview; `localhost:3611` in dev, a
// second Vercel project in production) where every AI block renders in a sandboxed iframe. Without it the feature is
// not offered: AI HTML never renders on the app's origin, and there is no srcdoc fallback.

/** Origin of the preview runtime, or `null` when it is not configured (or not a valid http(s) URL). */
export function previewOrigin(value: string | undefined = process.env.NEXT_PUBLIC_PREVIEW_ORIGIN): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // Same origin as the app would defeat the isolation.
    if (typeof location !== "undefined" && url.origin === location.origin) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** «Diseño con IA» is offered only when AI HTML has a separate origin to render in. */
export const aiRenderAvailable = (): boolean => previewOrigin() !== null;

/** URL of one island: the runtime trusts messages only from `parent` (the CSP's frame-ancestors pins it too). */
export function islandUrl(origin: string, parent: string): string {
  return `${origin}/island.html?parent=${encodeURIComponent(parent)}`;
}
