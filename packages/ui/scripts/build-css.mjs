// Concatena src/styles.css (resolviendo sus @import) en dist/dialmade-ui.css.
// Falla si algún .css de src/ no está importado, para que el bundle no se quede atrás.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const entry = path.join(srcDir, "styles.css");
const outFile = path.join(root, "dist", "dialmade-ui.css");
const IMPORT = /^@import\s+(?:url\()?["']([^"']+)["']\)?\s*;\s*$/gm;

const seen = new Set();

async function inline(file) {
  if (seen.has(file)) return "";
  seen.add(file);
  const css = await readFile(file, "utf8");
  const parts = [];
  let last = 0;
  for (const match of css.matchAll(IMPORT)) {
    parts.push(css.slice(last, match.index));
    const target = match[1];
    if (!target.startsWith(".")) throw new Error(`Solo se admiten @import relativos: ${target} (${file})`);
    const resolved = path.resolve(path.dirname(file), target);
    parts.push(`/* ${path.relative(srcDir, resolved)} */\n${(await inline(resolved)).trim()}\n`);
    last = match.index + match[0].length;
  }
  parts.push(css.slice(last));
  return parts.join("");
}

async function cssFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? cssFiles(path.join(dir, e.name)) : e.name.endsWith(".css") ? [path.join(dir, e.name)] : [])),
  );
  return nested.flat();
}

const bundle = await inline(entry);
const missing = (await cssFiles(srcDir)).filter((file) => !seen.has(file));
if (missing.length > 0) {
  console.error(`Faltan en src/styles.css:\n${missing.map((f) => `  ${path.relative(srcDir, f)}`).join("\n")}`);
  process.exit(1);
}

const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const banner = `/*! ${pkg.name} ${pkg.version} | MIT | generado por scripts/build-css.mjs */\n`;
await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, banner + bundle.replace(/\n{3,}/g, "\n\n"));
console.log(`dist/dialmade-ui.css: ${seen.size - 1} hojas, ${(Buffer.byteLength(bundle) / 1024).toFixed(1)} KB`);
