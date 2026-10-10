// Builds the Dialmade Figma plugin (packages/figma-plugin) and serves it as a ZIP from the app:
// public/downloads/dialmade-figma-plugin.zip (gitignored), linked from Exportar → Figma → «Cómo instalar el plugin».
// Runs before `next dev` and `next build`.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plugin = path.resolve(web, "../../packages/figma-plugin");
execFileSync(process.execPath, [path.join(plugin, "scripts/build.mjs")], { stdio: "inherit" });

const read = (file) => readFileSync(path.join(plugin, file));
const folder = "dialmade-figma-plugin";
const zip = zipSync(
  {
    [`${folder}/manifest.json`]: read("dist/manifest.json"),
    [`${folder}/code.js`]: read("dist/code.js"),
    [`${folder}/ui.html`]: read("dist/ui.html"),
    [`${folder}/README.md`]: strToU8(readFileSync(path.join(plugin, "README.md"), "utf8")),
  },
  { level: 9 },
);
const out = path.join(web, "public/downloads");
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, `${folder}.zip`), zip);
console.log(`public/downloads/${folder}.zip ${(zip.length / 1024).toFixed(1)} KB`);
