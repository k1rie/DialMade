// Usage: node sheet.mjs <brand>  → voto-<brand>.png: «1 · hoy» (Haiku in the app) next to «2 · skills» (desktop.png)
import { chromium } from "/Users/diegoguerrero/Desktop/designApp/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
const T = "/private/tmp/claude-501/-Users-diegoguerrero-Desktop-designApp/c3b5464f-5b4b-4820-a521-b2e3109f704d/scratchpad";
const brand = process.argv[2];
const b64 = async (f) => (await readFile(f)).toString("base64");
const cells = [
  ["1 · hoy", join(T, "finish/out", `${brand}-s-home-s1-today.png`)],
  ["2 · skills", join(T, "skilltest", brand, "desktop.png")],
];
const html = `<body style="margin:12px;background:#fff"><div style="display:flex;gap:12px;align-items:flex-start">${(await Promise.all(cells.map(async ([label, f]) => `<figure style="margin:0;flex:1;min-width:0"><figcaption style="font:600 22px system-ui;padding:6px 0">${brand} · ${label}</figcaption><img style="width:100%;display:block;border:1px solid #ccc" src="data:image/png;base64,${await b64(f)}"></figure>`))).join("")}</div></body>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 900 } });
await page.setContent(html);
await page.screenshot({ fullPage: true, path: join(T, "skilltest", `voto-${brand}.png`) });
await browser.close();
console.log("ok", brand);
