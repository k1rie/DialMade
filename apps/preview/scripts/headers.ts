// Response headers of the preview origin (spec §6.1). The same values go to the dev server (./serve.mjs) and to the
// production host's config. `appOrigin` is the only page allowed to frame the islands.

/** `appOrigin`: e.g. https://dialmade.app or http://localhost:3610. */
export function previewHeaders(appOrigin: string): Record<string, string> {
  const origin = new URL(appOrigin).origin;
  const csp = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "require-trusted-types-for 'script'",
    "trusted-types dialmade-island",
    `frame-ancestors ${origin}`,
  ].join("; ");
  return {
    "Content-Security-Policy": csp,
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "cross-origin",
    // The island document has an opaque origin (sandbox without allow-same-origin): its module script is a CORS
    // request from `Origin: null`. The files are public and static.
    "Access-Control-Allow-Origin": "*",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=(), clipboard-write=()",
  };
}
