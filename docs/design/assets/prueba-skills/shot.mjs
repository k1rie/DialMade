// Usage: node shot.mjs <dir>  → <dir>/desktop.png (1280, full page) and <dir>/mobile.png (390, full page)
import { chromium } from "/Users/diegoguerrero/Desktop/designApp/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs";
import { join, resolve } from "node:path";
const dir = resolve(process.argv[2]);
const browser = await chromium.launch();
for (const [name, width] of [["desktop", 1280], ["mobile", 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto("file://" + join(dir, "index.html"), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.style} ${f.weight}`));
  await page.screenshot({ path: join(dir, `${name}.png`), fullPage: true });
  console.log(name, "overflow:", overflow, "fonts:", [...new Set(fonts)].join(" | "));
  await page.close();
}
await browser.close();
