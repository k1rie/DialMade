#!/usr/bin/env node
// Google Fonts index for the font matcher: vendor/ui-ux-pro-max-skill (MIT, see NOTICE) google-fonts.csv →
// src/fonts/font-index.json (family, category, weights). The Popularity Rank and Trending Rank columns are
// dropped (importar-guia-critique.md #8), so ties are broken by name. `--check` fails when the JSON is stale.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_DIR, "../..");
const VENDOR_DIR = process.env.VENDOR_DIR ? resolve(process.env.VENDOR_DIR) : join(REPO_ROOT, "vendor");
const UPSTREAM_DIR = join(VENDOR_DIR, "ui-ux-pro-max-skill");
const CSV_PATH = join(UPSTREAM_DIR, "src/ui-ux-pro-max/data/google-fonts.csv");
const OUT = join(PACKAGE_DIR, "src/fonts/font-index.json");

const UPSTREAM_URL = "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill";
const PINNED_COMMIT = "50d8a7de0900119855614541f15a1a616691eb33";
const DROPPED_COLUMN = /popular|trend/i;
const CATEGORIES = { "sans serif": "sans-serif", serif: "serif", display: "display", handwriting: "handwriting", monospace: "monospace" };

const checkOnly = process.argv.includes("--check");

function fail(message) {
  console.error(`font-index: ${message}`);
  process.exit(1);
}

/** Minimal RFC 4180 reader: quoted fields, escaped quotes and line breaks inside quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.length > 1 || r[0] !== "");
  if (!header) return { columns: [], rows: [] };
  const columns = header.map((key) => key.trim());
  return { columns, rows: body.map((r) => Object.fromEntries(columns.map((key, i) => [key, (r[i] ?? "").trim()]))) };
}

function readCommit() {
  try {
    return execFileSync("git", ["-C", UPSTREAM_DIR, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return PINNED_COMMIT;
  }
}

if (!existsSync(CSV_PATH)) {
  fail(`missing ${CSV_PATH}.\n  vendor/ is not part of the repo: run \`bash scripts/fetch-vendor.sh\` from the root first.`);
}

const text = readFileSync(CSV_PATH, "utf8");
const { columns, rows } = parseCsv(text);
for (const required of ["Family", "Category", "Styles"]) if (!columns.includes(required)) fail(`column "${required}" not found`);
const dropped = columns.filter((column) => DROPPED_COLUMN.test(column));

const seen = new Set();
const families = [];
for (const row of rows) {
  const family = row.Family.replace(/\s+/g, " ").trim();
  if (!family || seen.has(family.toLowerCase())) continue;
  seen.add(family.toLowerCase());
  const category = CATEGORIES[row.Category.toLowerCase()] ?? "sans-serif";
  const weights = [
    ...new Set(
      row.Styles.split("|")
        .map((style) => style.trim())
        .filter((style) => /^\d{3}$/.test(style))
        .map(Number),
    ),
  ].sort((a, b) => a - b);
  families.push([family, category, weights.length > 0 ? weights : [400]]);
}
families.sort((a, b) => a[0].localeCompare(b[0], "en"));

const commit = readCommit();
if (commit !== PINNED_COMMIT) console.warn(`font-index: vendor is at ${commit}; the pinned commit is ${PINNED_COMMIT}.`);

const index = {
  generator: "packages/import/scripts/build-font-index.mjs",
  upstream: UPSTREAM_URL,
  commit,
  license: "MIT",
  source: "src/ui-ux-pro-max/data/google-fonts.csv",
  sha256: createHash("sha256").update(text).digest("hex"),
  droppedColumns: dropped,
  columns: ["family", "category", "weights"],
  count: families.length,
  families,
};

// One family per line: readable diffs, and about half the size of a pretty-printed file.
const body = families.map((entry) => `    ${JSON.stringify(entry)}`).join(",\n");
const { families: _list, ...meta } = index;
const head = JSON.stringify(meta, null, 2).replace(/\n\}$/, "");
const rendered = `${head},\n  "families": [\n${body}\n  ]\n}\n`;
JSON.parse(rendered);

if (checkOnly) {
  if (!existsSync(OUT) || readFileSync(OUT, "utf8") !== rendered) fail("src/fonts/font-index.json is stale. Run `pnpm --filter @dialmade/import font-index`.");
  console.log("font-index: up to date.");
} else {
  writeFileSync(OUT, rendered);
  console.log(`font-index: ${families.length} families → src/fonts/font-index.json (dropped: ${dropped.join(", ") || "none"})`);
}
