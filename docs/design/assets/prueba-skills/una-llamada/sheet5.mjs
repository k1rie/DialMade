// Usage: node sheet5.mjs <brand> → voto-<brand>.png with the five arms side by side.
import { chromium } from "/Users/diegoguerrero/Desktop/designApp/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
const S = "/private/tmp/claude-501/-Users-diegoguerrero-Desktop-designApp/c3b5464f-5b4b-4820-a521-b2e3109f704d/scratchpad";
const brand = process.argv[2];
const cells = [
  ["1 · hoy (Haiku, tokens)", join(S, "finish/out", `${brand}-s-home-s1-today.png`)],
  ["2 · Haiku sin skills", join(S, "skilltest/b/haiku-plain", brand, "desktop.png")],
  ["3 · Haiku + skills", join(S, "skilltest/b/haiku-skills", brand, "desktop.png")],
  ["4 · Sonnet + skills", join(S, "skilltest/b/sonnet-skills", brand, "desktop.png")],
  ["5 · agente + skills (ganó)", join(S, "skilltest", brand, "desktop.png")],
];
const figs = await Promise.all(cells.map(async ([label, f]) => `<figure style="margin:0;flex:1;min-width:0"><figcaption style="font:600 26px system-ui;padding:6px 0">${label}</figcaption><img style="width:100%;display:block;border:1px solid #ccc" src="data:image/png;base64,${(await readFile(f)).toString("base64")}"></figure>`));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 3200, height: 900 } });
await page.setContent(`<body style="margin:16px;background:#fff"><div style="font:700 30px system-ui;margin-bottom:8px">${brand}</div><div style="display:flex;gap:16px;align-items:flex-start">${figs.join("")}</div></body>`);
await page.screenshot({ fullPage: true, path: join(S, "skilltest/b", `voto-${brand}.png`) });
await browser.close();
console.log("ok", brand);
