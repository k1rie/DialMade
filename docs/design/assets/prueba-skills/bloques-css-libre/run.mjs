// Test C: «Diseño con IA» as today (one Haiku call per screen, the same 7 blocks in their layout cells, same art
// direction and draft copy), but each block may carry its own scoped <style> and inline SVG with the theme's CSS
// variables instead of token classes. Renders by swapping the blocks into today's saved page (same grid, theme, kit).
// The key is read from apps/web/.env.local by code and never printed. Hard cap MAX_USD.
import Anthropic from "/Users/diegoguerrero/Desktop/designApp/node_modules/.pnpm/@anthropic-ai+sdk@0.128.0_zod@4.6.5/node_modules/@anthropic-ai/sdk/index.mjs";
import { chromium } from "/Users/diegoguerrero/Desktop/designApp/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const S = "/private/tmp/claude-501/-Users-diegoguerrero-Desktop-designApp/c3b5464f-5b4b-4820-a521-b2e3109f704d/scratchpad";
const HERE = join(S, "skilltest/c");
const MAX_USD = 0.1;
const FONTS = {
  brisa: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..800;1,14..32,400..700&display=swap",
  vectora: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,300..700;1,300..700&display=swap",
  ollaria: "https://fonts.googleapis.com/css2?family=Outfit:wght@300..700&family=Work+Sans:ital,wght@0,300..600;1,300..600&display=swap",
};

const SYSTEM = `You are an award-winning design director and front-end engineer inside Dialmade. The developer already decided the brand, the palette, the fonts and the LAYOUT of the screen: which blocks exist, their order and their box on the grid. You design how each block LOOKS inside its own box and write its words. You never add, remove, merge or reorder blocks.

# Output contract
- HTML only: no Markdown, no code fences, no prose. One root element per block, in exactly the order given, each exactly once: <section data-block-id="ID">…</section> (navbar → <header>, footer → <footer>). The root fills its box: never set a width, margin or position on it.
- Each root may start with ONE <style> element. Every selector in it starts with [data-block-id="ID"] (its own id), so it never touches another block. The root is a size container: write responsive rules with @container (min-width: …) on the root's width, mobile first; the box can be 390 px wide on a phone.
- Colors ONLY through the theme's CSS variables, so palette and dark mode still apply: var(--background) var(--foreground) var(--card) var(--card-foreground) var(--primary) var(--primary-foreground) var(--secondary) var(--secondary-foreground) var(--accent) var(--accent-foreground) var(--muted) var(--muted-foreground) var(--cta) var(--cta-foreground) var(--border). Tints and shades: color-mix(in oklch, var(--primary) 20%, var(--background)) and the like. Never a hex, rgb() or named color.
- Fonts: font-family: var(--dl-font-heading) for headings, var(--dl-font-body) for text, var(--dl-font-mono) for mono; italics are real. Radii: var(--dl-radius-sm|md|lg|xl|full), var(--dl-card-radius), var(--dl-button-radius).
- Imagery: inline <svg> (fill/stroke with currentColor or the theme variables) or CSS; no <img>, no external URLs, no @import, no url(), no <script>, no event handlers, no iframes, no forms (inputs with labels are fine).
- Links: href="#screen:ID" only for a block's "linksTo" screen and the listed "screens"; other links href="#". Buttons are <button type="button">. Exactly one h1, only in the block marked "h1": true; the rest start at h2.

# Design
- Follow the art direction (axes, moves, concept, context): it applies to every block, so the page reads as one product. The "facts" are real: use them as given; never invent other numbers or prices; never name real companies, people or products. The "avoid" is a hard no.
- Start from each block's "draft" (template copy): keep prices, plan names, numbers and link names; rewrite everything else for THIS product, concrete and short. Show exactly "count" items where given.
- Make it look designed by a person with a point of view, not generated: one bold idea per block, a signature object that shows this product working, real hierarchy and scale contrast, deliberate whitespace, believable sample data. Avoid AI clichés: generic three equal cards with icons in circles, purple gradients, fake logo rows, emoji, walls of badges.`;

const env = await readFile("/Users/diegoguerrero/Desktop/designApp/apps/web/.env.local", "utf8");
const apiKey = env.split("\n").find((l) => l.startsWith("ANTHROPIC_API_KEY="))?.slice(18).trim().replace(/^["']|["']$/g, "");
const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 600_000 });
const cost = (u) => ((u.input_tokens ?? 0) * 0.1 + (u.cache_creation_input_tokens ?? 0) * 0.125 + (u.cache_read_input_tokens ?? 0) * 0.01 + (u.output_tokens ?? 0) * 0.5) / 1e6;

let total = 0;
const browser = await chromium.launch();
for (const brand of ["brisa", "vectora", "ollaria"]) {
  if (total >= MAX_USD) throw new Error(`stop at $${total}`);
  const msg = await readFile(join(S, "research/build", `${brand}-screenmsg.txt`), "utf8");
  const art = msg.match(/<art_direction>\n[\s\S]*?\n<\/art_direction>/)[0];
  const data = msg.match(/<screen_data>\n([\s\S]*?)\n<\/screen_data>/);
  const screen = JSON.parse(data[1]);
  const ids = screen.blocks.map((b) => b.id);
  const user = `${art}\n\n${data[0]}\n\nDesign the ${ids.length} blocks of this screen. Write exactly ${ids.length} roots, in this order: ${ids.join(", ")}. HTML only.`;
  const t0 = performance.now();
  const message = await client.beta.messages.stream({ model: "claude-haiku-5-5", max_tokens: 32_000, system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: [{ type: "text", text: user }] }], output_config: { effort: "medium" } }).finalMessage();
  const raw = message.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const usd = cost(message.usage);
  total += usd;
  const out = join(HERE, brand);
  await mkdir(out, { recursive: true });
  await writeFile(join(out, "raw.html"), raw);
  // Swap the new roots into today's page: same grid, theme and kit; plus the real italics of the brand's fonts.
  const page0 = await readFile(join(S, "research/art1", `${brand}-s-home-base-haiku-s1.html`), "utf8");
  const page = page0.replace("</head>", `<link rel="stylesheet" href="${FONTS[brand]}"><style>[data-dl-ai-block] > [data-block-id]{container-type:inline-size}</style></head>`);
  await writeFile(join(out, "index.html"), page);
  const tab = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await tab.goto("file://" + join(out, "index.html"), { waitUntil: "networkidle" });
  const swapped = await tab.evaluate(({ raw, ids }) => {
    const box = document.createElement("div");
    box.innerHTML = raw;
    let n = 0;
    for (const wrap of document.querySelectorAll("[data-dl-ai-block]")) {
      const old = wrap.firstElementChild;
      const id = old?.getAttribute("data-block-id");
      const fresh = id && box.querySelector(`[data-block-id="${id}"]`);
      if (fresh) { wrap.replaceChildren(fresh); n++; }
    }
    box.querySelectorAll("script").forEach((s) => s.remove());
    return { n, ids: ids.length };
  }, { raw, ids });
  const final = await tab.content();
  await writeFile(join(out, "index.html"), final);
  for (const [name, width] of [["desktop", 1280], ["mobile", 390]]) {
    await tab.setViewportSize({ width, height: 900 });
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForTimeout(300);
    const overflow = await tab.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    await tab.screenshot({ path: join(out, `${name}.png`), fullPage: true });
    if (overflow) console.log(brand, name, "OVERFLOW");
  }
  await tab.close();
  const styles = (raw.match(/<style/g) ?? []).length, svgs = (raw.match(/<svg/g) ?? []).length;
  console.log(brand, `$${usd.toFixed(4)}`, `${((performance.now() - t0) / 1000).toFixed(0)}s`, message.stop_reason, `${raw.length} chars`, `swapped ${swapped.n}/${swapped.ids}`, `styles ${styles} svgs ${svgs}`, `total $${total.toFixed(4)}`);
}
await browser.close();
await writeFile(join(HERE, "spend.json"), JSON.stringify({ total }, null, 1));
