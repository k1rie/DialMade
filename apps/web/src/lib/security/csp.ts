// The app's Content-Security-Policy (spec §6.1 and §6.4, tracks C). What it is for:
// - `connect-src`: the page talks to its own origin and, with the user's key (BYOK), to api.anthropic.com only: an
//   injected script could not post a key or a document anywhere else;
// - `frame-src`: the only frames are the sandboxed AI islands of the preview origin (none when it is not configured);
// - no plugins, no <base> hijack, forms only to the app, and the app is not framed by other sites.
// Next.js inlines its bootstrap scripts (and the app's pre-paint script) without nonces, so `script-src` keeps
// 'unsafe-inline'; development adds 'unsafe-eval' (React's dev tooling) and the HMR websocket.
// Pure and dependency-free: next.config.ts imports it.

export const ANTHROPIC_API_ORIGIN = "https://api.anthropic.com";
const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES = "https://fonts.gstatic.com";

/** The http(s) origin of `value`, or null (same rules as the preview origin of the islands). */
function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

export type AppCspOptions = {
  /** `NEXT_PUBLIC_PREVIEW_ORIGIN`: the sandboxed islands of «Diseño con IA». */
  previewOrigin?: string | undefined;
  /** `NEXT_PUBLIC_APP_URL`: the preview origin must never be the app itself. */
  appUrl?: string | undefined;
  dev: boolean;
};

/** Hosts of the profile pictures Better Auth stores from GitHub and Google sign-ins (AccountMenu). */
const OAUTH_AVATAR_ORIGINS = ["https://avatars.githubusercontent.com", "https://lh3.googleusercontent.com"];

export function appCspDirectives({ previewOrigin, appUrl, dev }: AppCspOptions): Record<string, string[]> {
  const preview = originOf(previewOrigin);
  const frames = preview && preview !== originOf(appUrl) ? [preview] : ["'none'"];
  return {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'", GOOGLE_FONTS_CSS],
    "font-src": ["'self'", "data:", GOOGLE_FONTS_FILES],
    // The account avatar comes from the OAuth provider (GitHub, Google).
    "img-src": ["'self'", "data:", "blob:", ...OAUTH_AVATAR_ORIGINS],
    // blob:/data: — the app reads its own logo and sample URLs with fetch.
    "connect-src": ["'self'", "blob:", "data:", ANTHROPIC_API_ORIGIN, ...(dev ? ["ws:", "wss:"] : [])],
    "worker-src": ["'self'", "blob:"],
    "frame-src": frames,
    "child-src": frames,
    "media-src": ["'self'", "blob:", "data:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
  };
}

export function appCsp(options: AppCspOptions): string {
  return Object.entries(appCspDirectives(options))
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}

/** Headers of every app response. */
export function appSecurityHeaders(options: AppCspOptions): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: appCsp(options) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  ];
}
