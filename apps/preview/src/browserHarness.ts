// Test-only: the island in a real browser. Three local origins: the app (a page that frames one island and records
// its messages), the preview origin (the runtime, built by vite into a temp dir and served with the production
// headers) and an «attacker» that counts every request it gets. Used by the *.browser.test.ts files; they skip when
// Chromium is not installed (`npx playwright install chromium`).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type Frame, type Page } from "playwright";
import { build } from "vite";
import { createPreviewServer } from "../scripts/server.ts";

export const hasChromium = (() => {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

const listen = (server: Server) =>
  new Promise<string>((resolve) => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)));
const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()));

/** The app page: a secret, one island, and the island's messages in `window.messages`. */
const appPage = (islandSrc: string) => `<!doctype html><html><head><meta charset="utf-8"><title>app</title></head><body style="margin:0">
<div id="secret">top secret</div>
<iframe id="island" sandbox="allow-scripts" src="${islandSrc}" style="display:block;width:1000px;height:600px;border:0"></iframe>
<script>
  window.messages = [];
  window.addEventListener("message", (event) => {
    if (event.source === document.getElementById("island").contentWindow) window.messages.push(event.data);
  });
  window.post = (message) => document.getElementById("island").contentWindow.postMessage(message, "*");
</script></body></html>`;

export type Harness = {
  browser: Browser;
  page: Page;
  island: Frame;
  appUrl: string;
  attackerUrl: string;
  attackerHits: string[];
  /** Console errors of the app page and the island (CSP and Trusted Types violations land here). */
  consoleErrors: string[];
  close: () => Promise<void>;
};

export async function startHarness(): Promise<Harness> {
  const dist = await mkdtemp(join(tmpdir(), "dl-preview-"));
  await build({ root: join(import.meta.dirname, ".."), logLevel: "silent", build: { outDir: dist, emptyOutDir: true } });
  const servers: Server[] = [];
  const attackerHits: string[] = [];
  const attacker = createServer((request, response) => {
    attackerHits.push(`${request.method} ${request.url}`);
    response.writeHead(200, { "Access-Control-Allow-Origin": "*", "Content-Type": "text/plain" }).end("pwned");
  });
  servers.push(attacker);
  const attackerUrl = await listen(attacker);
  // The app's origin must be known before the preview server (frame-ancestors): start it first.
  let islandSrc = "";
  const app = createServer((_request, response) => response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(appPage(islandSrc)));
  servers.push(app);
  const appUrl = await listen(app);
  const preview = createPreviewServer(dist, appUrl);
  servers.push(preview);
  islandSrc = `${await listen(preview)}/island.html?parent=${encodeURIComponent(appUrl)}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(appUrl);
  await page.waitForFunction(() => (window as unknown as { messages: { type: string }[] }).messages.some((m) => m.type === "ready"));
  const island = page.frames().find((frame) => frame.url().includes("/island.html"))!;
  return {
    browser,
    page,
    island,
    appUrl,
    attackerUrl,
    attackerHits,
    consoleErrors,
    close: async () => {
      await browser.close();
      await Promise.all(servers.map(close));
      await rm(dist, { recursive: true, force: true });
    },
  };
}

/** Posts a message to the island from the app page. */
export const postToIsland = (page: Page, message: unknown) =>
  page.evaluate((m) => (window as unknown as { post: (message: unknown) => void }).post(m), message);

/** The island's messages so far. */
export const islandMessages = (page: Page) => page.evaluate(() => (window as unknown as { messages: { type: string }[] }).messages);
