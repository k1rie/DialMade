// Builds the plugin into dist/: code.js (main thread), ui.html (UI with its script inline) and manifest.json,
// ready for Figma Desktop's «Plugins → Development → Import plugin from manifest…».
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
await mkdir(dist, { recursive: true });

const common = { bundle: true, minify: true, legalComments: "none", logLevel: "warning", write: false, charset: "utf8" };
// The main thread runs in Figma's sandbox: plain ES2017, no DOM.
const code = await build({ ...common, entryPoints: [path.join(root, "src/code.ts")], target: "es2017", format: "iife" });
const ui = await build({ ...common, entryPoints: [path.join(root, "src/ui.ts")], target: "es2020", format: "iife" });

const html = (await readFile(path.join(root, "src/ui.html"), "utf8")).replace(
  "/*__UI_SCRIPT__*/",
  () => ui.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"),
);

const manifest = {
  name: "Dialmade",
  id: "dialmade-local-dev",
  api: "1.0.0",
  main: "code.js",
  ui: "ui.html",
  editorType: ["figma"],
  documentAccess: "dynamic-page",
  networkAccess: { allowedDomains: ["none"] },
};

await writeFile(path.join(dist, "code.js"), code.outputFiles[0].text);
await writeFile(path.join(dist, "ui.html"), html);
await writeFile(path.join(dist, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
const size = (text) => `${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`;
console.log(`dist/code.js ${size(code.outputFiles[0].text)} · dist/ui.html ${size(html)} · dist/manifest.json`);
