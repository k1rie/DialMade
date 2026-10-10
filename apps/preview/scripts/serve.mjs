// Dev server of the preview origin: serves dist/ (vite build) on its own port with the production headers.
//   PREVIEW_PORT (default 3611) · PREVIEW_APP_ORIGIN (default NEXT_PUBLIC_APP_URL or http://localhost:3610)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { previewHeaders } from "./headers.ts";

const port = Number(process.env.PREVIEW_PORT ?? 3611);
const appOrigin = process.env.PREVIEW_APP_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3610";
const root = join(import.meta.dirname, "../dist");
/** @type {Record<string, string>} */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".map": "application/json" };
const headers = previewHeaders(appOrigin);

createServer(async (request, response) => {
  const path = normalize(new URL(request.url ?? "/", "http://x").pathname).replace(/^(\.\.[/\\])+/, "");
  const file = path === "/" ? "/island.html" : path;
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405).end();
    return;
  }
  try {
    const body = await readFile(join(root, file));
    response.writeHead(200, { ...headers, "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404, headers).end();
  }
}).listen(port, () => console.log(`[preview] http://localhost:${port} (frame-ancestors ${new URL(appOrigin).origin})`));
