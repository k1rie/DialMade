// Usage: node sheet.mjs <brand> <name> <label=png>... → <name>-<brand>.png, columns side by side.
import { chromium } from "/Users/diegoguerrero/Desktop/designApp/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
const [brand, name, ...cols] = process.argv.slice(2);
const figs = await Promise.all(cols.map(async (c) => { const [label, f] = c.split("="); return `<figure style="margin:0;flex:1;min-width:0"><figcaption style="font:600 24px system-ui;padding:6px 0">${label}</figcaption><img style="width:100%;display:block;border:1px solid #ccc" src="data:image/png;base64,${(await readFile(f)).toString("base64")}"></figure>`; }));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 760 * cols.length, height: 900 } });
await page.setContent(`<body style="margin:16px;background:#fff"><div style="font:700 28px system-ui;margin-bottom:8px">${brand}</div><div style="display:flex;gap:16px;align-items:flex-start">${figs.join("")}</div></body>`);
await page.screenshot({ fullPage: true, path: join(import.meta.dirname, `${name}-${brand}.png`) });
await browser.close();
console.log("ok", name, brand);
