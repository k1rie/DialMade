// pnpm promo:capture — PNG captures of the dev-only /promo route for the promo video
// (docs/design/encargo-promo-capturas.md). Runs against a dev server that is already up:
//
//   corepack pnpm --filter web dev                    # in another terminal
//   corepack pnpm --filter web promo:capture
//
// Environment:
//   PROMO_BASE_URL   dev server, http or https (default http://localhost:3000)
//   PROMO_OUT_DIR    output folder (default apps/web/.promo-captures/). A relative path is taken from the
//                    folder pnpm was run in (INIT_CWD), not from apps/web
//   PROMO_LANG       es | en (default es)
//   PROMO_SCENES     comma-separated scene ids to recapture (default: all; the rest of manifest.json is kept)
//   PROMO_TIMEOUT_MS per page: its load, and the wait for `data-promo-ready`, which the route also takes as its
//                    own limit (default 120000; the first visit compiles the route)
//   PROMO_ATTEMPTS   page loads allowed per file (default 4; 1 trusts a single load), see «Same bytes»
//
// Output (stable names): `<scene>.png` (1440×900 at DPR 2), `<scene>-mobile.png` (390×844 at DPR 2),
// `<scene>__<part>.png` (DPR 3 unless the part says otherwise: the part's box plus the reach of its shadows),
// `manifest.json` (size, CSS boxes, the `clip` each part PNG covers, sha256) and `tokens.json` (:root variables
// and the font families in use). All or nothing: files are shot into a temporary folder outside `<out>` and only
// copied into `<out>` once every capture succeeded, so a failed run leaves the previous capture as it was. The
// staging folder is not inside `<out>` because a synced folder (iCloud Drive's Desktop & Documents) can undo a
// create → move → delete sequence there: it once put a moved PNG back into a deleted `<out>/.partial/`.
//
// Same bytes on every run:
// - Google Fonts (the user's page) answers the same css2 URL now and then with on-the-fly font kits
//   (`fonts.gstatic.com/l/font?kit=…`) instead of its static files (`/s/<family>/v…`): other binaries, other
//   glyph advances, other pixels. The script fetches each stylesheet itself, retries until it gets the static
//   files and serves that answer to every page of the run.
// - Each file is still shot on fresh page loads until two loads in a row give the same bytes; a run that cannot
//   get there fails instead of writing a one-off. Best with the machine otherwise idle.
// - Capturing needs internet (Google Fonts): a font request that fails fails the run, instead of capturing
//   the page with fallback fonts.
// Chromium: `corepack pnpm --filter web exec playwright install chromium`.
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type BrowserContext, type Page, type Route } from "playwright";
import type * as Scenes from "./scenes";

type PromoSceneSpec = Scenes.PromoSceneSpec;
type PromoViewportId = Scenes.PromoViewportId;
type PromoLang = Scenes.PromoLang;

// Plain Node runs the TypeScript manifest (type stripping); the explicit `.ts` path is resolved at run time.
const manifestModule = (await import(new URL("./scenes.ts", import.meta.url).href)) as typeof Scenes;
const { PROMO_MANIFEST_VERSION, PROMO_SCENES, PROMO_VIEWPORTS, PART_DPR, SCREEN_DPR, isPromoLang, promoFileName, promoPath } = manifestModule;

const READY = "data-promo-ready";
const ERROR = "data-promo-error";
const PENDING = "data-promo-pending";
const PART = "data-promo-part";
const FONTS_CSS_HOST = "fonts.googleapis.com";
const FONTS_FILES_HOST = "fonts.gstatic.com";
/** The only hosts besides the dev server: the Google Fonts of the user's page (ThemeScope, DeckFonts). */
const ALLOWED_HOSTS = new Set([FONTS_CSS_HOST, FONTS_FILES_HOST]);
/** Google Fonts' on-the-fly kits; its static files live under `/s/`. */
const FONT_KIT = /fonts\.gstatic\.com\/l\/font\?/;
const FONT_CSS_TRIES = 8;
/** Upper bound of the margin a part's shadows add to its PNG, per side (CSS px). */
const MAX_SHADOW_REACH = 160;
const COMMAND = "corepack pnpm --filter web promo:capture";

function fail(message: string): never {
  console.error(`promo:capture: ${message}`);
  process.exit(1);
}

/** An expected failure: printed without a stack trace. */
class CaptureError extends Error {}

// ── Config ────────────────────────────────────────────────────────────────────────────────────────

function readBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail(`PROMO_BASE_URL must be an http(s) URL such as http://localhost:3000 (got "${value}")`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") fail(`PROMO_BASE_URL must use http or https (got "${value}")`);
  return url;
}

function readPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) fail(`${name} must be a positive whole number (got "${raw}")`);
  return value;
}

const baseUrl = readBaseUrl(process.env.PROMO_BASE_URL ?? "http://localhost:3000");
const outDir = process.env.PROMO_OUT_DIR
  ? path.resolve(process.env.INIT_CWD ?? process.cwd(), process.env.PROMO_OUT_DIR)
  : fileURLToPath(new URL("../.promo-captures/", import.meta.url));
const langInput = process.env.PROMO_LANG ?? manifestModule.PROMO_DEFAULT_LANG;
if (!isPromoLang(langInput)) fail(`PROMO_LANG must be es or en (got "${langInput}")`);
const lang: PromoLang = langInput;
const timeout = readPositiveInteger("PROMO_TIMEOUT_MS", 120_000);
/** The route gives up a little earlier than the script, so its own reason (`data-promo-error`) comes through. */
const routeTimeout = Math.max(1_000, timeout - 2_000);
const attempts = readPositiveInteger("PROMO_ATTEMPTS", 4);
const sceneFilter = process.env.PROMO_SCENES?.split(",").map((id) => id.trim()).filter(Boolean);
const unknownScenes = sceneFilter?.filter((id) => !PROMO_SCENES.some((scene) => scene.id === id)) ?? [];
if (unknownScenes.length > 0) fail(`Unknown scene(s) in PROMO_SCENES: ${unknownScenes.join(", ")}`);
const scenes = sceneFilter ? PROMO_SCENES.filter((scene) => sceneFilter.includes(scene.id)) : PROMO_SCENES;

// ── Manifest types ────────────────────────────────────────────────────────────────────────────────

type Box = { x: number; y: number; width: number; height: number };

type ScreenEntry = {
  file: string;
  kind: "screen";
  scene: string;
  url: string;
  viewport: { id: PromoViewportId; width: number; height: number };
  dpr: number;
  size: { width: number; height: number };
  /** CSS px border box of each part in this screen (viewport coordinates at scroll 0). */
  parts: Record<string, Box>;
  sha256: string;
};

type PartEntry = {
  file: string;
  kind: "part";
  scene: string;
  part: string;
  url: string;
  /** Cut out over transparency (real alpha) or cropped from the screen as is. */
  transparent: boolean;
  /** Pixels with alpha < 255 (transparent parts only). */
  alpha?: { translucentRatio: number };
  dpr: number;
  size: { width: number; height: number };
  /** CSS px border box of the part in `<scene>.png` (the same box as in its `parts`). */
  box: Box;
  /**
   * CSS px rectangle of `<scene>.png` this PNG covers, in whole pixels: the box plus the reach of its
   * shadows. Place the layer here; `size` is exactly `clip` × `dpr`.
   */
  clip: Box;
  screen: string;
  sha256: string;
};

type Entry = ScreenEntry | PartEntry;

type FontUse = {
  /** CSS family (the @font-face name to install), or the system font's own name. */
  family: string;
  /** Names the font files report (a Google Fonts subset may call itself «Lora Medium»). */
  platformFamilies: string[];
  postScriptNames: string[];
  custom: boolean;
  weights: number[];
  styles: string[];
  stacks: string[];
  scopes: string[];
};

// ── PNG helpers ───────────────────────────────────────────────────────────────────────────────────

function pngSize(png: Buffer): { width: number; height: number } {
  if (png.toString("ascii", 1, 4) !== "PNG") throw new Error("Not a PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");
const round = (value: number) => Math.round(value * 100) / 100;
const roundBox = (box: Box): Box => ({ x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height) });

// ── Google Fonts ──────────────────────────────────────────────────────────────────────────────────

type CssAnswer = { status: number; contentType: string; body: string; kit: boolean };

/** One answer per stylesheet URL for the whole run (see the header). */
const fontsCss = new Map<string, Promise<CssAnswer>>();
/** Why a stylesheet could not be fetched, by URL (reported by the page that asked for it). */
const fontsCssErrors = new Map<string, string>();

async function fetchFontsCss(url: string, userAgent: string): Promise<CssAnswer> {
  let answer: CssAnswer | null = null;
  for (let attempt = 0; attempt < FONT_CSS_TRIES; attempt++) {
    const response = await fetch(url, { headers: { "user-agent": userAgent, accept: "text/css,*/*;q=0.1" }, signal: AbortSignal.timeout(timeout) });
    const body = await response.text();
    answer = { status: response.status, contentType: response.headers.get("content-type") ?? "text/css; charset=utf-8", body, kit: FONT_KIT.test(body) };
    if (!response.ok || !answer.kit) return answer;
  }
  console.warn(`  ! Google Fonts answered ${FONT_CSS_TRIES} times with font kits for ${url}; the capture uses them`);
  return answer!;
}

async function fulfillFontsCss(route: Route) {
  const request = route.request();
  const userAgent = request.headers()["user-agent"] ?? "";
  const key = `${userAgent}\n${request.url()}`;
  let answer = fontsCss.get(key);
  if (!answer) {
    answer = fetchFontsCss(request.url(), userAgent);
    fontsCss.set(key, answer);
    answer.catch(() => fontsCss.delete(key));
  }
  let css: CssAnswer;
  try {
    css = await answer;
  } catch (error) {
    // The page reports it (`requestfailed`).
    fontsCssErrors.set(request.url(), error instanceof Error ? error.message : String(error));
    return route.abort("failed").catch(() => {});
  }
  await route.fulfill({ status: css.status, contentType: css.contentType, headers: { "access-control-allow-origin": "*" }, body: css.body }).catch(() => {});
}

// ── Browser ───────────────────────────────────────────────────────────────────────────────────────

const blocked = new Set<string>();
const contexts = new Map<string, BrowserContext>();

async function contextFor(browser: Browser, viewport: PromoViewportId, dpr: number): Promise<BrowserContext> {
  const key = `${viewport}@${dpr}`;
  const existing = contexts.get(key);
  if (existing) return existing;
  const size = PROMO_VIEWPORTS[viewport];
  const mobile = viewport === "mobile";
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    screen: { width: size.width, height: size.height },
    deviceScaleFactor: dpr,
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: "dark",
    reducedMotion: "reduce",
    locale: lang === "es" ? "es-ES" : "en-US",
    timezoneId: "UTC",
    serviceWorkers: "block",
  });
  // The route waits for `data-promo-ready` as long as the script does (usePromoReady).
  await context.addInitScript((ms) => {
    window.__DIALMADE_PROMO_TIMEOUT_MS__ = ms;
  }, routeTimeout);
  // No network besides the dev server and the user's page fonts; no /api (the route also stubs AI).
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === baseUrl.origin) {
      if (url.pathname.startsWith("/api/")) {
        blocked.add(url.pathname);
        return route.abort("blockedbyclient");
      }
      return route.continue();
    }
    if (url.hostname === FONTS_CSS_HOST) return fulfillFontsCss(route);
    if (ALLOWED_HOSTS.has(url.hostname)) return route.continue();
    blocked.add(url.origin);
    return route.abort("blockedbyclient");
  });
  contexts.set(key, context);
  return context;
}

/** Google Fonts requests of a page that failed: the page would paint fallback fonts. */
const fontFailures = new WeakMap<Page, string[]>();

function assertFonts(page: Page, pathname: string) {
  const failures = fontFailures.get(page) ?? [];
  if (failures.length > 0) {
    throw new CaptureError(
      `${pathname} → Google Fonts did not load (${[...new Set(failures)].join("; ")}). The capture needs internet; without it the user's page shows fallback fonts.`,
    );
  }
}

async function openScene(browser: Browser, viewport: PromoViewportId, dpr: number, pathname: string): Promise<Page> {
  const page = await (await contextFor(browser, viewport, dpr)).newPage();
  const errors: string[] = [];
  const failures: string[] = [];
  fontFailures.set(page, failures);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const reason = fontsCssErrors.get(request.url()) ?? request.failure()?.errorText ?? "failed";
    // ERR_ABORTED is the page dropping a request it no longer needs (an unmounted <link>), not the network.
    if (ALLOWED_HOSTS.has(url.hostname) && reason !== "net::ERR_ABORTED") failures.push(`${url.hostname}${url.pathname}: ${reason}`);
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (ALLOWED_HOSTS.has(url.hostname) && response.status() >= 400) failures.push(`${url.hostname}${url.pathname}: HTTP ${response.status()}`);
  });
  try {
    await page.goto(new URL(pathname, baseUrl).href, { waitUntil: "load", timeout });
    const state = await page
      .waitForFunction(
        ([ready, error, pending]) => {
          const html = document.documentElement;
          // The route keeps `data-promo-pending` when it gave up waiting.
          if (html.hasAttribute(error!)) return `error: ${html.getAttribute(error!)}${html.hasAttribute(pending!) ? " Raise PROMO_TIMEOUT_MS if the dev server is slow." : ""}`;
          return html.hasAttribute(ready!) ? "ready" : false;
        },
        [READY, ERROR, PENDING],
        { timeout, polling: 100 },
      )
      .then((handle) => handle.jsonValue())
      .catch(async () => {
        const pending = await page.evaluate((attribute) => document.documentElement.getAttribute(attribute), PENDING).catch(() => null);
        return `not ready after ${timeout} ms${pending ? ` (still waiting for: ${pending})` : ""}; raise PROMO_TIMEOUT_MS if the dev server is slow`;
      });
    if (state !== "ready") {
      assertFonts(page, pathname);
      throw new CaptureError(`${pathname} → ${state}${errors.length > 0 ? `\n  page errors: ${errors.join(" | ")}` : ""}`);
    }
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    assertFonts(page, pathname);
    return page;
  } catch (error) {
    await page.close();
    throw error;
  }
}

const SHOT = { animations: "disabled", caret: "hide", scale: "device", type: "png" } as const;

type Shot<T> = { png: Buffer; signature: string; data: T };

/**
 * Loads the page and shoots it until two loads in a row give the same bytes (and geometry), so no PNG is a
 * one-off of a single load. Returns the accepted shot with its page, still open.
 */
async function stableShot<T>(file: string, load: () => Promise<Page>, take: (page: Page) => Promise<Shot<T>>): Promise<Shot<T> & { page: Page; loads: number }> {
  let previous: Shot<T> | null = null;
  const seen: string[] = [];
  for (let loads = 1; loads <= attempts; loads++) {
    const page = await load();
    let current: Shot<T>;
    try {
      current = await take(page);
    } catch (error) {
      await page.close();
      throw error;
    }
    if (attempts === 1 || (previous && previous.signature === current.signature && previous.png.equals(current.png))) {
      return { ...current, page, loads };
    }
    seen.push(sha256(current.png).slice(0, 12));
    await page.close();
    previous = current;
  }
  throw new CaptureError(
    `${file}: ${attempts} page loads and no two in a row gave the same image (${seen.join(", ")}). Capture again with the machine idle, or raise PROMO_ATTEMPTS.`,
  );
}

async function partBoxes(page: Page): Promise<Record<string, Box>> {
  const boxes = await page.$$eval(`[${PART}]`, (elements, attribute) => {
    const result: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      result[element.getAttribute(attribute)!] = { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
    }
    return result;
  }, PART);
  return Object.fromEntries(
    Object.entries(boxes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, box]) => [id, roundBox(box)]),
  );
}

type PartGeometry = { box: Box; clip: Box };

/**
 * The part's border box and the whole-pixel rectangle its PNG covers: the box grown by the outer box-shadows of
 * the part and its visible descendants (Chromium paints a blur radius B as a Gaussian of σ = B/2, cut at 3σ;
 * a descendant's shadow only counts where its overflow ancestors let it show). When that reaches past the end
 * of the page, an invisible, out-of-flow marker extends the page so the shadow can be shot; the top and left
 * stop at the page's origin.
 */
async function partGeometry(page: Page, id: string): Promise<PartGeometry> {
  const measured = await page.evaluate(
    ([attribute, part, maxReach]) => {
      const element = document.querySelector(`[${attribute}="${part}"]`);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const edges = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      /** Outer layers of a computed box-shadow («rgb(0 0 0 / 0.5) 0px 24px 56px -16px, …»). */
      const shadows = (value: string) => {
        if (value === "none") return [];
        const layers: string[] = [];
        let depth = 0;
        let start = 0;
        for (let i = 0; i < value.length; i++) {
          if (value[i] === "(") depth++;
          else if (value[i] === ")") depth--;
          else if (value[i] === "," && depth === 0) {
            layers.push(value.slice(start, i));
            start = i + 1;
          }
        }
        layers.push(value.slice(start));
        return layers
          .filter((layer) => !/\binset\b/.test(layer))
          .map((layer) => {
            const [x = 0, y = 0, blur = 0, spread = 0] = (layer.match(/-?[\d.]+px/g) ?? []).map(parseFloat);
            return { x, y, blur, spread };
          });
      };
      /** Where a descendant can paint: the boxes of its ancestors (up to the part) that clip their overflow. */
      const visibleArea = (node: Element) => {
        const area = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity };
        if (node === element) return area;
        for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          const box = ancestor.getBoundingClientRect();
          if (style.overflowX !== "visible") {
            area.left = Math.max(area.left, box.left);
            area.right = Math.min(area.right, box.right);
          }
          if (style.overflowY !== "visible") {
            area.top = Math.max(area.top, box.top);
            area.bottom = Math.min(area.bottom, box.bottom);
          }
          if (ancestor === element) break;
        }
        return area;
      };
      for (const node of [element, ...element.querySelectorAll("*")]) {
        const style = getComputedStyle(node);
        if (style.boxShadow === "none" || style.visibility !== "visible") continue;
        const box = node.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        const area = visibleArea(node);
        for (const { x, y, blur, spread } of shadows(style.boxShadow)) {
          const reach = 1.5 * blur + spread;
          const left = Math.max(area.left, box.left + x - reach);
          const top = Math.max(area.top, box.top + y - reach);
          const right = Math.min(area.right, box.right + x + reach);
          const bottom = Math.min(area.bottom, box.bottom + y + reach);
          if (right <= left || bottom <= top) continue;
          edges.left = Math.min(edges.left, left);
          edges.top = Math.min(edges.top, top);
          edges.right = Math.max(edges.right, right);
          edges.bottom = Math.max(edges.bottom, bottom);
        }
      }
      const x = Math.max(0, Math.floor(Math.max(edges.left, rect.left - maxReach) + window.scrollX));
      const y = Math.max(0, Math.floor(Math.max(edges.top, rect.top - maxReach) + window.scrollY));
      let right = Math.ceil(Math.min(edges.right, rect.right + maxReach) + window.scrollX);
      let bottom = Math.ceil(Math.min(edges.bottom, rect.bottom + maxReach) + window.scrollY);

      // Playwright's full-page size: the clip must stay inside it to be shot as is.
      const pageSize = () => {
        const html = document.documentElement;
        const body = document.body;
        return {
          width: Math.max(body.scrollWidth, html.scrollWidth, body.offsetWidth, html.offsetWidth, body.clientWidth, html.clientWidth),
          height: Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight, html.offsetHeight, body.clientHeight, html.clientHeight),
        };
      };
      if (bottom > pageSize().height) {
        const room = document.createElement("div");
        room.setAttribute("aria-hidden", "true");
        room.setAttribute("data-promo-room", "");
        room.style.cssText = `position:absolute;left:0;top:${bottom - 1}px;width:1px;height:1px;visibility:hidden;pointer-events:none`;
        document.body.append(room);
      }
      const size = pageSize();
      right = Math.min(size.width, right);
      bottom = Math.min(size.height, bottom);
      return {
        box: { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height },
        clip: { x, y, width: right - x, height: bottom - y },
      };
    },
    [PART, id, MAX_SHADOW_REACH] as const,
  );
  if (!measured) throw new CaptureError(`part "${id}" is not on the page (data-promo-part)`);
  if (measured.clip.width <= 0 || measured.clip.height <= 0) throw new CaptureError(`part "${id}" is empty`);
  return { box: roundBox(measured.box), clip: measured.clip };
}

/** Shoots `clip` (page CSS px), over transparency for transparent parts; beyond the viewport only when it must. */
async function shootClip(page: Page, clip: Box, transparent: boolean): Promise<Buffer> {
  const viewport = page.viewportSize()!;
  const fits = clip.x + clip.width <= viewport.width && clip.y + clip.height <= viewport.height;
  return page.screenshot({ ...SHOT, clip, fullPage: !fits, omitBackground: transparent });
}

/** Share of pixels with alpha < 255, decoded in the browser (proves a transparent part has real alpha). */
async function translucentRatio(page: Page, png: Buffer): Promise<number> {
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = new OffscreenCanvas(image.naturalWidth, image.naturalHeight);
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let translucent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) translucent++;
    return Math.round((translucent / (data.length / 4)) * 10000) / 10000;
  }, png.toString("base64"));
}

// ── Tokens ────────────────────────────────────────────────────────────────────────────────────────

type RootTokens = {
  colors: Record<string, string>;
  radii: Record<string, string>;
  shadows: Record<string, string>;
  typography: Record<string, string>;
  other: Record<string, string>;
};

/** `:root` custom properties through getComputedStyle: colors as hex (#rrggbb / #rrggbbaa), radii, shadows. */
async function rootTokens(page: Page): Promise<RootTokens> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    const names = new Set<string>();
    for (let i = 0; i < computed.length; i++) {
      const name = computed.item(i);
      if (name.startsWith("--")) names.add(name);
    }
    const scan = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule && /(^|,)\s*(:root|html)\s*(,|$)/.test(rule.selectorText)) {
          for (let i = 0; i < rule.style.length; i++) if (rule.style.item(i).startsWith("--")) names.add(rule.style.item(i));
        }
        if ("cssRules" in rule && rule.cssRules) scan(rule.cssRules as CSSRuleList);
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        scan(sheet.cssRules);
      } catch {
        // Cross-origin sheets (Google Fonts) have no custom properties for :root.
      }
    }

    const canvas = new OffscreenCanvas(1, 1);
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const probe = document.createElement("span");
    probe.style.display = "none";
    document.body.append(probe);
    const hex2 = (n: number) => n.toString(16).padStart(2, "0");
    /** The browser's own conversion: alpha from the computed color, RGB from an opaque paint. */
    const toHex = (value: string): string | null => {
      if (!CSS.supports("color", value)) return null;
      probe.style.color = "";
      probe.style.color = value;
      const color = getComputedStyle(probe).color;
      let alpha = 1;
      let opaque = color;
      const slash = /^(.*\S)\s*\/\s*([\d.]+)(%?)\s*\)$/.exec(color);
      const rgba = /^rgba\((\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*),\s*([\d.]+)\s*\)$/.exec(color);
      if (slash) {
        alpha = Number(slash[2]) / (slash[3] ? 100 : 1);
        opaque = `${slash[1]})`;
      } else if (rgba) {
        alpha = Number(rgba[2]);
        opaque = `rgb(${rgba[1]})`;
      }
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = "#000";
      context.fillStyle = opaque;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      const base = `#${hex2(r!)}${hex2(g!)}${hex2(b!)}`;
      return alpha >= 1 ? base : `${base}${hex2(Math.round(alpha * 255))}`;
    };
    const colorPattern = /(?:#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\))/g;
    const withHexColors = (value: string) => value.replace(colorPattern, (match) => toHex(match) ?? match);

    const tokens = { colors: {}, radii: {}, shadows: {}, typography: {}, other: {} } as Record<keyof RootTokens, Record<string, string>>;
    for (const name of [...names].sort()) {
      if (name.startsWith("--tw-")) continue;
      const value = computed.getPropertyValue(name).trim();
      if (!value) continue;
      const hex = toHex(value);
      if (hex !== null) {
        // Registered theme roles of the user's page (@property, initial transparent) are not :root tokens.
        if (hex === "#00000000" && !name.startsWith("--app-")) continue;
        tokens.colors[name] = hex;
      } else if (name.includes("radius")) tokens.radii[name] = value;
      else if (/shadow|ring/.test(name) || (CSS.supports("box-shadow", value) && colorPattern.test(value))) tokens.shadows[name] = withHexColors(value);
      else if (/^--(font|text|leading|tracking)/.test(name)) tokens.typography[name] = value;
      else tokens.other[name] = value;
      colorPattern.lastIndex = 0;
    }
    probe.remove();
    return tokens;
  });
}

const normalizeFamily = (name: string) => name.toLowerCase().replace(/\s+/g, "");

/**
 * CSS family of a web font from the name its file reports: the longest loaded family of the stack it starts
 * with («Lora Medium» → Lora, «Newsreader 16pt» → Newsreader). Text of a child in another font (CDP reports
 * the node's whole text) keeps the file's own name.
 */
function cssFamilyOf(platformFamily: string, loadedInStack: string[]): string {
  const platform = normalizeFamily(platformFamily);
  const prefixed = loadedInStack.filter((family) => platform.startsWith(normalizeFamily(family))).sort((a, b) => b.length - a.length);
  return prefixed[0] ?? platformFamily;
}

/** Fonts that actually rendered text (CDP CSS.getPlatformFontsForNode), with the CSS weights asking for them. */
async function fontsInUse(page: Page, scene: string, uses: Map<string, FontUse & { scenes: Set<string> }>) {
  const samples = await page.evaluate(() => {
    const unquote = (name: string) => name.trim().replace(/^(["'])(.*)\1$/, "$2");
    const loaded = new Set([...document.fonts].filter((face) => face.status === "loaded").map((face) => unquote(face.family).toLowerCase()));
    const result: { stack: string; loadedInStack: string[]; weight: number; style: string; scope: string }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element || seen.has(element) || !node.textContent?.trim()) continue;
      seen.add(element);
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.visibility === "hidden" || style.display === "none" || rect.width === 0 || rect.height === 0) continue;
      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName)) continue;
      element.setAttribute("data-promo-font-probe", String(result.length));
      result.push({
        stack: style.fontFamily,
        loadedInStack: style.fontFamily
          .split(",")
          .map(unquote)
          .filter((family) => loaded.has(family.toLowerCase())),
        weight: Number(style.fontWeight),
        style: style.fontStyle,
        scope: element.closest(".app-theme-scope") ? "page" : "app",
      });
      if (result.length >= 2000) break;
    }
    return result;
  });
  const cdp = await page.context().newCDPSession(page);
  const add = <T>(list: T[], value: T) => {
    if (!list.includes(value)) list.push(value);
  };
  try {
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "[data-promo-font-probe]" });
    for (const nodeId of nodeIds) {
      const { attributes } = await cdp.send("DOM.getAttributes", { nodeId });
      const index = Number(attributes[attributes.indexOf("data-promo-font-probe") + 1]);
      const sample = samples[index];
      if (!sample) continue;
      const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
      for (const font of fonts) {
        const family = font.isCustomFont ? cssFamilyOf(font.familyName, sample.loadedInStack) : font.familyName;
        const use = uses.get(family) ?? {
          family,
          platformFamilies: [],
          postScriptNames: [],
          custom: font.isCustomFont,
          weights: [],
          styles: [],
          stacks: [],
          scopes: [],
          scenes: new Set<string>(),
        };
        add(use.platformFamilies, font.familyName);
        if (font.postScriptName) add(use.postScriptNames, font.postScriptName);
        add(use.weights, sample.weight);
        add(use.styles, sample.style);
        add(use.stacks, sample.stack);
        add(use.scopes, sample.scope);
        use.scenes.add(scene);
        uses.set(family, use);
      }
    }
  } finally {
    await cdp.detach().catch(() => {});
    await page.evaluate(() => document.querySelectorAll("[data-promo-font-probe]").forEach((element) => element.removeAttribute("data-promo-font-probe")));
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────────────────────────

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

async function checkServer() {
  const probe = new URL(promoPath({ scene: "home" }), baseUrl).href;
  const response = await fetch(probe, { signal: AbortSignal.timeout(timeout) }).catch((error: unknown) => {
    let reason = String(error);
    if (error instanceof Error) {
      const cause = error.cause as { code?: string; message?: string } | undefined;
      reason = error.name === "TimeoutError" ? `no answer in ${timeout} ms` : (cause?.code ?? (cause?.message || error.message));
    }
    fail(`no dev server at ${baseUrl.origin} (${reason}). Start it first: corepack pnpm --filter web dev (or set PROMO_BASE_URL).`);
  });
  if (response.status === 404) fail(`${probe} answers 404: /promo only exists in development (next dev).`);
  if (!response.ok) fail(`${probe} answers ${response.status}.`);
}

async function main() {
  await checkServer();
  await mkdir(outDir, { recursive: true });
  const previous = await readJson<{ version?: number; files?: Entry[]; lang?: string }>(path.join(outDir, "manifest.json"));
  if (sceneFilter && previous) {
    if (previous.version !== PROMO_MANIFEST_VERSION) {
      fail(`${outDir} holds a capture in manifest format ${previous.version ?? "?"} (now ${PROMO_MANIFEST_VERSION}): recapture all scenes (no PROMO_SCENES).`);
    }
    if (previous.lang && previous.lang !== lang) {
      fail(`${outDir} holds a ${previous.lang} capture: recapture all scenes (no PROMO_SCENES) or use PROMO_LANG=${previous.lang}.`);
    }
  }
  const previousTokens = await readJson<RootTokens & { brand?: unknown; typography?: { fonts?: (FontUse & { scenes: string[] })[] } }>(
    path.join(outDir, "tokens.json"),
  );

  // Outside `<out>` (see the header): a synced output folder only ever sees the finished files written in.
  const stagingDir = await mkdtemp(path.join(tmpdir(), "dialmade-promo-"));
  try {
    // sRGB output; software raster, because GPU raster of scaled text varies between runs.
    const browser = await chromium.launch({ headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars", "--disable-gpu"] }).catch((error: unknown) => {
      throw new CaptureError(
        `Chromium did not start (${error instanceof Error ? error.message.split("\n")[0] : String(error)}). Install it: corepack pnpm --filter web exec playwright install chromium`,
      );
    });
    const entries: Entry[] = [];
    const fonts = new Map<string, FontUse & { scenes: Set<string> }>();
    let tokens: RootTokens | null = null;
    let brand: unknown = null;
    const stage = async (file: string, png: Buffer) => {
      await writeFile(path.join(stagingDir, file), png);
      return { size: pngSize(png), sha256: sha256(png) };
    };
    const loadsNote = (loads: number) => (loads > 2 ? `  (${loads} loads)` : "");

    try {
      for (const scene of scenes as readonly PromoSceneSpec[]) {
        let desktopScreen: ScreenEntry | null = null;
        for (const viewport of scene.viewports) {
          const url = promoPath({ scene: scene.id, lang, viewport });
          const file = promoFileName(scene.id, { viewport });
          const shot = await stableShot(
            file,
            () => openScene(browser, viewport, SCREEN_DPR, url),
            async (page) => {
              const png = await page.screenshot(SHOT);
              const parts = await partBoxes(page);
              return { png, signature: JSON.stringify(parts), data: parts };
            },
          );
          try {
            const entry: ScreenEntry = {
              file,
              kind: "screen",
              scene: scene.id,
              url,
              viewport: { id: viewport, ...PROMO_VIEWPORTS[viewport] },
              dpr: SCREEN_DPR,
              parts: shot.data,
              ...(await stage(file, shot.png)),
            };
            entries.push(entry);
            if (viewport === "desktop") {
              desktopScreen = entry;
              tokens ??= await rootTokens(shot.page);
              brand ??= await shot.page.evaluate(() => window.__DIALMADE_PROMO__?.brand ?? null);
              await fontsInUse(shot.page, scene.id, fonts);
            }
            console.log(`  ${file}  ${entry.size.width}×${entry.size.height}${loadsNote(shot.loads)}`);
          } finally {
            await shot.page.close();
          }
        }
        if (!desktopScreen) throw new CaptureError(`${scene.id}: the manifest has no desktop screen to place its parts in`);

        // Transparent parts load `only=<part>&bg=transparent`; opaque ones are cropped from the scene as is.
        for (const part of scene.parts) {
          const dpr = part.dpr ?? PART_DPR;
          const url = promoPath({ scene: scene.id, lang, ...(part.transparent && { only: part.id, transparent: true }) });
          const file = promoFileName(scene.id, { part: part.id });
          const screenBox = desktopScreen.parts[part.id];
          if (!screenBox) throw new CaptureError(`${scene.id}: part "${part.id}" is not in ${desktopScreen.file}`);
          const shot = await stableShot(
            file,
            () => openScene(browser, "desktop", dpr, url),
            async (page) => {
              const geometry = await partGeometry(page, part.id);
              const png = await shootClip(page, geometry.clip, part.transparent);
              return { png, signature: JSON.stringify(geometry), data: geometry };
            },
          );
          try {
            const { box, clip } = shot.data;
            const written = await stage(file, shot.png);
            if (written.size.width !== clip.width * dpr || written.size.height !== clip.height * dpr) {
              throw new CaptureError(`${file} is ${written.size.width}×${written.size.height}, not its clip ${clip.width}×${clip.height} at DPR ${dpr}`);
            }
            const drift = Math.max(...(["x", "y", "width", "height"] as const).map((key) => Math.abs(box[key] - screenBox[key])));
            if (drift > 0.5) console.warn(`  ! ${file}: the part's box moved ${round(drift)} px from ${desktopScreen.file}`);
            const entry: PartEntry = {
              file,
              kind: "part",
              scene: scene.id,
              part: part.id,
              url,
              transparent: part.transparent,
              ...(part.transparent && { alpha: { translucentRatio: await translucentRatio(shot.page, shot.png) } }),
              dpr,
              box: screenBox,
              clip,
              screen: desktopScreen.file,
              ...written,
            };
            entries.push(entry);
            if (part.transparent && entry.alpha?.translucentRatio === 0) console.warn(`  ! ${file} has no transparent pixel`);
            console.log(`  ${file}  ${entry.size.width}×${entry.size.height}${part.transparent ? "  (alpha)" : ""}${loadsNote(shot.loads)}`);
          } finally {
            await shot.page.close();
          }
        }
      }
    } finally {
      await browser.close();
    }

    // A partial run (PROMO_SCENES) keeps the other scenes' entries; a full run removes files it no longer makes.
    const captured = new Set<string>(scenes.map((scene) => scene.id));
    const kept = sceneFilter ? (previous?.files ?? []).filter((entry) => !captured.has(entry.scene)) : [];
    const order = new Map<string, number>(PROMO_SCENES.map((scene, index) => [scene.id, index]));
    const files = [...kept, ...entries].sort(
      (a, b) => (order.get(a.scene) ?? 99) - (order.get(b.scene) ?? 99) || (a.kind === b.kind ? 0 : a.kind === "screen" ? -1 : 1),
    );

    const fontList = new Map<string, FontUse & { scenes: string[] }>();
    if (sceneFilter) {
      for (const font of previousTokens?.typography?.fonts ?? []) fontList.set(font.family, { ...font, scenes: font.scenes.filter((id) => !captured.has(id)) });
    }
    const merge = (a: (string | number)[] = [], b: (string | number)[]) => [...new Set([...a, ...b])];
    for (const [family, use] of fonts) {
      const before = fontList.get(family);
      fontList.set(family, {
        ...use,
        platformFamilies: merge(before?.platformFamilies, use.platformFamilies).map(String).sort(),
        postScriptNames: merge(before?.postScriptNames, use.postScriptNames).map(String).sort(),
        weights: merge(before?.weights, use.weights).map(Number).sort((a, b) => a - b),
        styles: merge(before?.styles, use.styles).map(String).sort(),
        stacks: merge(before?.stacks, use.stacks).map(String).sort(),
        scopes: merge(before?.scopes, use.scopes).map(String).sort(),
        scenes: merge(before?.scenes, [...use.scenes]).map(String).sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99)),
      });
    }
    const fontsOut = [...fontList.values()].filter((font) => font.scenes.length > 0).sort((a, b) => a.family.localeCompare(b.family));
    await writeFile(
      path.join(stagingDir, "manifest.json"),
      json({ version: PROMO_MANIFEST_VERSION, lang, command: COMMAND, viewports: PROMO_VIEWPORTS, files }),
    );
    await writeFile(
      path.join(stagingDir, "tokens.json"),
      json({
        version: PROMO_MANIFEST_VERSION,
        source: ":root via getComputedStyle (colors as hex #rrggbb or #rrggbbaa); fonts via CDP CSS.getPlatformFontsForNode, by CSS family",
        ...(tokens ?? { colors: previousTokens?.colors, radii: previousTokens?.radii, shadows: previousTokens?.shadows, other: previousTokens?.other }),
        typography: {
          ...(tokens?.typography ?? {}),
          weights: [...new Set(fontsOut.flatMap((font) => font.weights))].sort((a, b) => a - b),
          fonts: fontsOut,
        },
        brand: brand ?? previousTokens?.brand ?? null,
      }),
    );

    // Every capture succeeded: copy the run in, the JSON last, check what landed, then drop what a full run no
    // longer makes.
    for (const entry of entries) await copyFile(path.join(stagingDir, entry.file), path.join(outDir, entry.file));
    for (const name of ["tokens.json", "manifest.json"]) await copyFile(path.join(stagingDir, name), path.join(outDir, name));
    for (const entry of entries) {
      const written = await readFile(path.join(outDir, entry.file)).catch(() => null);
      if (!written || sha256(written) !== entry.sha256) throw new CaptureError(`${entry.file} did not land in ${outDir} as captured; capture again.`);
    }
    const current = new Set(files.map((entry) => entry.file));
    for (const stale of previous?.files ?? []) {
      if (!current.has(stale.file) && path.basename(stale.file) === stale.file) await rm(path.join(outDir, stale.file), { force: true });
    }

    console.log(`\n${files.length} PNG + manifest.json + tokens.json → ${outDir}`);
    if (blocked.size > 0) console.log(`Blocked requests: ${[...blocked].sort().join(", ")}`);
    const env = ["PROMO_BASE_URL", "PROMO_OUT_DIR", "PROMO_LANG"].filter((name) => process.env[name]).map((name) => `${name}=${process.env[name]}`);
    console.log(`Regenerate: ${[...env, COMMAND].join(" ")}`);
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  if (error instanceof CaptureError) fail(error.message);
  if (error instanceof Error && error.name === "TimeoutError") {
    fail(`${error.message.split("\n")[0]!.replace(/\.+$/, "")}. Raise PROMO_TIMEOUT_MS (now ${timeout} ms) if the dev server is slow; nothing was written to ${outDir}.`);
  }
  console.error(error);
  fail(`unexpected error; nothing was written to ${outDir}.`);
}
