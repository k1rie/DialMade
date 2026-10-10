// The preview origin's static server: serves a built runtime (vite build → dist/) with the production headers
// (./headers). Used by the dev server (./serve.mjs) and the browser tests; production uses the host's own static
// hosting with the same headers (./build-output.ts).
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { previewHeaders } from "./headers.ts";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
};

/** A server for `root` (the built files) that only `appOrigin` may frame. Not listening yet. */
export function createPreviewServer(root: string, appOrigin: string): Server {
  const headers = previewHeaders(appOrigin);
  return createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, headers).end();
      return;
    }
    const path = normalize(new URL(request.url ?? "/", "http://x").pathname).replace(/^(\.\.[/\\])+/, "");
    const file = path === "/" ? "/island.html" : path;
    try {
      const body = await readFile(join(root, file));
      response.writeHead(200, { ...headers, "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(404, headers).end();
    }
  });
}
