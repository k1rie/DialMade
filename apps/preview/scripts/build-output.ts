// Production config of the preview origin (spec §6.1, track D). The host is still to be decided (spec §14: a second
// Vercel project is the plan), so `vite build` is followed by this script, which writes the SAME headers as the dev
// server (./headers) in the two static-hosting formats that need no server code:
//   · dist/_headers: Cloudflare Pages and Netlify;
//   · .vercel/output/: Vercel's Build Output API v3 (static files plus a `config.json` whose first route sets the
//     headers on every response).
// The app origin comes from PREVIEW_APP_ORIGIN (or NEXT_PUBLIC_APP_URL). A production build without it fails: the
// CSP's frame-ancestors must name the real app, never a default.
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { previewHeaders } from "./headers.ts";

/** `_headers` file (Cloudflare Pages / Netlify): every path gets the preview headers. */
export function headersFile(appOrigin: string): string {
  const lines = Object.entries(previewHeaders(appOrigin)).map(([name, value]) => `  ${name}: ${value}`);
  return ["/*", ...lines, ""].join("\n");
}

/** `config.json` of Vercel's Build Output API v3: headers on every route, then the static files. */
export function vercelConfig(appOrigin: string) {
  return {
    version: 3,
    routes: [{ src: "/(.*)", headers: previewHeaders(appOrigin), continue: true }, { handle: "filesystem" }],
  };
}

/** The app origin for a build, or an error in production when it is missing. */
export function buildAppOrigin(env: Record<string, string | undefined>): string {
  const value = env.PREVIEW_APP_ORIGIN ?? env.NEXT_PUBLIC_APP_URL;
  if (value) return new URL(value).origin;
  if (env.VERCEL_ENV === "production" || env.CONTEXT === "production" || env.CF_PAGES_BRANCH === "main") {
    throw new Error("[preview] PREVIEW_APP_ORIGIN is required in production (it is the CSP's frame-ancestors)");
  }
  return "http://localhost:3610";
}

async function main() {
  const appOrigin = buildAppOrigin(process.env);
  const root = join(import.meta.dirname, "..");
  const dist = join(root, "dist");
  await writeFile(join(dist, "_headers"), headersFile(appOrigin));
  const output = join(root, ".vercel/output");
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(dist, join(output, "static"), { recursive: true });
  await rm(join(output, "static/_headers"), { force: true });
  await writeFile(join(output, "config.json"), `${JSON.stringify(vercelConfig(appOrigin), null, 2)}\n`);
  console.log(`[preview] headers for frame-ancestors ${appOrigin}: dist/_headers and .vercel/output/`);
}

if (import.meta.main) await main();
