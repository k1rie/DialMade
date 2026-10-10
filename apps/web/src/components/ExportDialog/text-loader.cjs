/* eslint-disable @typescript-eslint/no-require-imports -- a CommonJS loader run by Turbopack */
// Turbopack loader for ./kitCss.ts: exports a stylesheet as a string, with its relative @imports
// inlined (the same bundle `build:css` writes to dist/), so the exported HTML gets the kit CSS
// without depending on a prior package build.
const fs = require("node:fs");
const path = require("node:path");

const IMPORT = /^@import\s+(?:url\()?["']([^"']+)["']\)?\s*;\s*$/gm;

function inline(file, seen, loader) {
  if (seen.has(file)) return "";
  seen.add(file);
  if (loader !== undefined) loader.addDependency(file);
  const css = fs.readFileSync(file, "utf8");
  return css.replace(IMPORT, (statement, target) => {
    if (!target.startsWith(".")) return statement;
    return inline(path.resolve(path.dirname(file), target), seen, loader).trim();
  });
}

module.exports = function textLoader() {
  const css = inline(this.resourcePath, new Set(), this);
  return `export default ${JSON.stringify(css.replace(/\n{3,}/g, "\n\n"))};`;
};
