#!/usr/bin/env node
// ETL: vendor/ui-ux-pro-max-skill (MIT) → packages/catalog/data/*.json.
// Uso: node scripts/etl.mjs          regenera data/
//      node scripts/etl.mjs --check  falla si data/ no coincide con lo que generaría
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCsv, splitList } from "./csv.mjs";
import { AUDIENCE_CONCEPTS, SKIPPED_STYLE_TYPES } from "./curation/audiences.mjs";
import { LANDING_LAYOUTS, LANDING_SECTIONS, PATTERN_NAME_NORMALIZATION } from "./curation/landing.mjs";
import { EASE_FAMILIES_CSS, MOTION_TIERS } from "./curation/motion.mjs";
import { LANDING_PATTERN_OVERRIDES, PRODUCT_META } from "./curation/products.mjs";

const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_DIR, "../..");
const VENDOR_DIR = process.env.VENDOR_DIR ? resolve(process.env.VENDOR_DIR) : join(REPO_ROOT, "vendor");
const UPSTREAM_DIR = join(VENDOR_DIR, "ui-ux-pro-max-skill");
const INPUT_DIR = join(UPSTREAM_DIR, "src/ui-ux-pro-max/data");
const OUTPUT_DIR = join(PACKAGE_DIR, "data");

const UPSTREAM_URL = "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill";
const PINNED_COMMIT = "50d8a7de0900119855614541f15a1a616691eb33";
const EXPECTED_PRODUCTS = 192;
const DROPPED_COLUMN = /popular|trend/i;
const INPUT_FILES = ["products.csv", "landing.csv", "styles.csv", "typography.csv", "motion.csv", "google-fonts.csv"];

const checkOnly = process.argv.includes("--check");

function fail(message) {
  console.error(`etl: ${message}`);
  process.exit(1);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values) {
  return [...new Set(values)];
}

function isNotApplicable(value) {
  return !value || /^n\/a\b/i.test(value);
}

// ---------------------------------------------------------------- entradas

if (!existsSync(INPUT_DIR)) {
  fail(
    `no encuentro ${INPUT_DIR}.\n` +
      "  vendor/ no forma parte del repo: descárgalo con `bash scripts/fetch-vendor.sh` desde la raíz y vuelve a correr el ETL.",
  );
}

const inputs = {};
const droppedColumns = {};
for (const file of INPUT_FILES) {
  const path = join(INPUT_DIR, file);
  if (!existsSync(path)) fail(`falta ${file} en ${INPUT_DIR}. Vuelve a correr scripts/fetch-vendor.sh.`);
  const text = readFileSync(path, "utf8");
  const rows = parseCsv(text);
  const dropped = Object.keys(rows[0] ?? {}).filter((column) => DROPPED_COLUMN.test(column));
  if (dropped.length > 0) droppedColumns[file] = dropped;
  inputs[file] = {
    sha256: createHash("sha256").update(text).digest("hex"),
    rows: rows.map((row) => Object.fromEntries(Object.entries(row).filter(([column]) => !dropped.includes(column)))),
  };
}

function readCommit() {
  try {
    return execFileSync("git", ["-C", UPSTREAM_DIR, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return PINNED_COMMIT;
  }
}

const commit = readCommit();
if (commit !== PINNED_COMMIT) {
  console.warn(`etl: aviso, vendor está en ${commit} y el commit fijado es ${PINNED_COMMIT}.`);
}

// ---------------------------------------------------------------- estilos

const styleRows = inputs["styles.csv"].rows;
const styleByIdentity = new Map();
for (const row of styleRows) {
  for (const identity of [row["Style ID"], row["Style Category"], ...splitList(row.Aliases, "|")]) {
    if (identity) styleByIdentity.set(identity.toLowerCase(), row);
  }
}

function resolveStyleId(reference) {
  let row = styleByIdentity.get(reference.trim().toLowerCase());
  const seen = new Set();
  while (row && row.Status === "deprecated") {
    if (!row["Parent Style ID"] || seen.has(row["Style ID"])) return undefined;
    seen.add(row["Style ID"]);
    row = styleByIdentity.get(row["Parent Style ID"].toLowerCase());
  }
  return row?.["Style ID"];
}

const liveStyles = styleRows.filter((row) => row.Status !== "deprecated");

const styleSources = liveStyles.map((row) => ({
  id: row["Style ID"],
  name: row["Style Category"],
  type: row.Type,
  status: row.Status,
}));

const styleAvoidConcepts = new Map();
for (const row of liveStyles) {
  if (SKIPPED_STYLE_TYPES.has(row.Type)) continue;
  const phrases = splitList(row["Do Not Use For"].replace(/\([^)]*\)/g, "").toLowerCase()).filter(
    (phrase) => !phrase.startsWith("none") && !phrase.startsWith("non-"),
  );
  const concepts = AUDIENCE_CONCEPTS.filter((concept) => phrases.some((phrase) => concept.avoid.test(phrase))).map(
    (concept) => concept.id,
  );
  if (concepts.length > 0) styleAvoidConcepts.set(row["Style ID"], new Set(concepts));
}

// ---------------------------------------------------------------- landing

const landingRows = inputs["landing.csv"].rows;
const patternIds = new Set(landingRows.map((row) => row["Pattern ID"]));
const patternByIdentity = new Map();
for (const row of landingRows) {
  for (const identity of [row["Pattern ID"], row["Pattern Name"], ...splitList(row.Aliases, "|")]) {
    if (identity) patternByIdentity.set(identity.toLowerCase(), row["Pattern ID"]);
  }
}

const usedOverrides = new Set();
function resolveLandingPattern(raw) {
  if (isNotApplicable(raw)) return undefined;
  const exact = patternByIdentity.get(raw.toLowerCase());
  if (exact) return exact;

  let normalized = raw;
  for (const [from, to] of PATTERN_NAME_NORMALIZATION) normalized = normalized.replaceAll(from, to);
  const viaNormalization = patternByIdentity.get(normalized.toLowerCase());
  if (viaNormalization) return viaNormalization;

  const override = LANDING_PATTERN_OVERRIDES[raw];
  if (override) {
    if (!patternIds.has(override)) fail(`LANDING_PATTERN_OVERRIDES["${raw}"] apunta a "${override}", que no existe en landing.csv.`);
    usedOverrides.add(raw);
    return override;
  }
  fail(`no sé a qué patrón de landing.csv corresponde "${raw}". Añádelo a LANDING_PATTERN_OVERRIDES.`);
}

const sectionNames = new Set(LANDING_SECTIONS.map((section) => section.replace(/^landing\./, "")));
const layoutByPattern = new Map();
for (const layout of LANDING_LAYOUTS) {
  for (const section of layout.sections) {
    if (!sectionNames.has(section)) fail(`el layout "${layout.id}" usa la sección desconocida "${section}".`);
  }
  if (!layout.patterns.includes(layout.sourcePatternId)) {
    fail(`el layout "${layout.id}" no incluye su sourcePatternId "${layout.sourcePatternId}" en patterns.`);
  }
  for (const pattern of layout.patterns) {
    if (!patternIds.has(pattern)) fail(`el layout "${layout.id}" cita "${pattern}", que no existe en landing.csv.`);
    if (layoutByPattern.has(pattern)) fail(`"${pattern}" está en dos layouts: ${layoutByPattern.get(pattern)} y ${layout.id}.`);
    layoutByPattern.set(pattern, layout.id);
  }
}
const uncovered = [...patternIds].filter((pattern) => !layoutByPattern.has(pattern));
if (uncovered.length > 0) fail(`patrones de landing.csv sin layout: ${uncovered.join(", ")}.`);

const landingLayouts = LANDING_LAYOUTS.map((layout) => ({
  id: layout.id,
  label: layout.label,
  description: layout.description,
  sections: layout.sections.map((section) => `landing.${section}`),
  sourcePatternId: layout.sourcePatternId,
  patternIds: layout.patterns,
}));

// ---------------------------------------------------------------- productos

const productRows = inputs["products.csv"].rows;
if (productRows.length !== EXPECTED_PRODUCTS) {
  fail(`products.csv tiene ${productRows.length} filas y se esperaban ${EXPECTED_PRODUCTS}.`);
}

const knownNames = new Set(productRows.map((row) => row["Product Type"]));
const missingMeta = [...knownNames].filter((name) => !PRODUCT_META[name]);
const staleMeta = Object.keys(PRODUCT_META).filter((name) => !knownNames.has(name));
if (missingMeta.length > 0) fail(`faltan etiquetas en curation/products.mjs para: ${missingMeta.join(", ")}.`);
if (staleMeta.length > 0) fail(`curation/products.mjs tiene tipos que ya no están en products.csv: ${staleMeta.join(", ")}.`);

const unresolvedStyles = new Set();
const productTypes = productRows.map((row) => {
  const name = row["Product Type"];
  const [labelEs, group] = PRODUCT_META[name];
  const keywords = unique(splitList(row.Keywords.toLowerCase()));

  const styleIds = [];
  const recommended = [...splitList(row["Primary Style Recommendation"], "+"), ...splitList(row["Secondary Styles"].replace(/\+/g, ","))];
  for (const reference of recommended) {
    const id = resolveStyleId(reference);
    if (id) styleIds.push(id);
    else unresolvedStyles.add(reference);
  }
  const recommendedIds = unique(styleIds);

  const withKeywords = `${name} ${keywords.join(" ")}`.toLowerCase();
  const concepts = new Set(
    AUDIENCE_CONCEPTS.filter((concept) => concept.product.test(concept.nameOnly ? name.toLowerCase() : withKeywords)).map(
      (concept) => concept.id,
    ),
  );
  const doNotUseStyles = liveStyles
    .map((style) => style["Style ID"])
    .filter((styleId) => !recommendedIds.includes(styleId))
    .filter((styleId) => [...(styleAvoidConcepts.get(styleId) ?? [])].some((concept) => concepts.has(concept)));

  const landingPatternId = resolveLandingPattern(row["Landing Page Pattern"]);
  const dashboardStyle = row["Dashboard Style (if applicable)"];

  return {
    id: slugify(name),
    label: { es: labelEs, en: name },
    group,
    ...(landingPatternId ? { landingPatternId } : {}),
    ...(isNotApplicable(dashboardStyle) ? {} : { dashboardStyle }),
    styleIds: recommendedIds,
    doNotUseStyles,
    keywords,
  };
});

if (unresolvedStyles.size > 0) fail(`estilos recomendados sin Style ID en styles.csv: ${[...unresolvedStyles].join(", ")}.`);
const duplicatedIds = productTypes.map((p) => p.id).filter((id, index, all) => all.indexOf(id) !== index);
if (duplicatedIds.length > 0) fail(`ids de producto repetidos: ${duplicatedIds.join(", ")}.`);
for (const raw of Object.keys(LANDING_PATTERN_OVERRIDES)) {
  if (!usedOverrides.has(raw)) console.warn(`etl: aviso, LANDING_PATTERN_OVERRIDES["${raw}"] ya no se usa.`);
}

// ---------------------------------------------------------------- motion

function parseMsRange(value) {
  const match = /^(\d+)\s*-\s*(\d+)\s*ms$/.exec(value.trim());
  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const motionRows = inputs["motion.csv"].rows;
const motionTiers = MOTION_TIERS.map((tier) => {
  const rows = motionRows.filter((row) => row["Intensity Tier"] === tier.source);
  const ranges = rows.map((row) => parseMsRange(row.Duration)).filter(Boolean);
  if (ranges.length === 0) fail(`motion.csv no tiene duraciones en ms para el tier "${tier.source}".`);

  const counts = new Map();
  for (const row of rows) {
    const family = row.Easing.split(/[.(\s]/)[0];
    if (EASE_FAMILIES_CSS[family]) counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  const [family] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!family) fail(`motion.csv no tiene una curva traducible para el tier "${tier.source}".`);

  return {
    id: tier.id,
    label: tier.label,
    description: tier.description,
    durations: {
      fast: Math.min(...ranges.map(([low]) => low)),
      base: Math.round(median(ranges.map(([low, high]) => (low + high) / 2)) / 5) * 5,
      slow: Math.max(...ranges.map(([, high]) => high)),
    },
    ease: EASE_FAMILIES_CSS[family],
  };
});

// ---------------------------------------------------------------- tipografía

const typographySources = inputs["typography.csv"].rows.map((row) => ({
  id: slugify(row["Font Pairing Name"]),
  name: row["Font Pairing Name"],
  category: row.Category,
  heading: row["Heading Font"],
  body: row["Body Font"],
  mood: splitList(row["Mood/Style Keywords"].toLowerCase()),
}));

// Solo las familias que uupm ya usa en sus pairings (licencia verificada aguas arriba), con los pesos que ofrece Google Fonts.
const googleFontByFamily = new Map(inputs["google-fonts.csv"].rows.map((row) => [row.Family, row]));
const pooledFamilies = unique(typographySources.flatMap((pairing) => [pairing.heading, pairing.body]));
const fonts = pooledFamilies
  .map((family) => {
    const row = googleFontByFamily.get(family);
    if (!row) {
      console.warn(`etl: aviso, "${family}" no está en google-fonts.csv; se deja fuera de fonts.json.`);
      return undefined;
    }
    const weights = unique(
      splitList(row.Styles, "|")
        .filter((style) => /^\d+$/.test(style))
        .map(Number),
    ).sort((a, b) => a - b);
    return { family, category: slugify(row.Category), weights };
  })
  .filter((font) => font && font.weights.length > 0)
  .sort((a, b) => a.family.localeCompare(b.family, "en"));

// ---------------------------------------------------------------- salida

const source = {
  upstream: UPSTREAM_URL,
  commit,
  license: "MIT",
  generator: "packages/catalog/scripts/etl.mjs",
  files: Object.fromEntries(
    INPUT_FILES.map((file) => [file, { sha256: inputs[file].sha256, rows: inputs[file].rows.length }]),
  ),
  droppedColumns,
};

const upstreamLicense = readFileSync(join(UPSTREAM_DIR, "LICENSE"), "utf8").trim();

const attribution = `# Atribución / Attribution

Los JSON de esta carpeta se generan con \`scripts/etl.mjs\` a partir de **ui-ux-pro-max-skill**,
publicado bajo licencia MIT. Las recetas, los pairings y los chips de \`src/data/\` están escritos a mano
para Dialmade, inspirados en esos mismos datos.

The JSON files in this folder are generated by \`scripts/etl.mjs\` from **ui-ux-pro-max-skill**,
released under the MIT License. The recipes, pairings and chips in \`src/data/\` are hand-written for
Dialmade, inspired by the same data.

- Repositorio / Repository: ${UPSTREAM_URL}
- Commit: \`${commit}\`
- Archivos de origen / Source files: ${INPUT_FILES.map((file) => `\`src/ui-ux-pro-max/data/${file}\``).join(", ")}

## Transformaciones / Changes

- \`productTypes.json\`: los 192 tipos de \`products.csv\` con id estable, etiqueta en español (traducción propia),
  grupo, patrón de landing resuelto contra \`landing.csv\`, estilos recomendados resueltos a Style ID y
  \`doNotUseStyles\` cruzando «Do Not Use For» de \`styles.csv\` con conceptos de audiencia propios.
- \`landingLayouts.json\`: 6 layouts curados que agrupan los 34 patrones de \`landing.csv\`.
- \`motionTiers.json\`: 3 tiers derivados de \`motion.csv\`. No se copian snippets de GSAP; las curvas se traducen a \`cubic-bezier\`.
- \`styleSources.json\`: índice de estilos de \`styles.csv\` sin los deprecados.
- \`typographySources.json\`: índice de los pairings de \`typography.csv\` (sin imports CSS ni configuración de Tailwind).
- \`fonts.json\`: las familias que usan los pairings de \`typography.csv\`, con categoría y pesos de \`google-fonts.csv\`.
  Se eliminan las columnas de popularidad y tendencia.

## Licencia / License

\`\`\`
${upstreamLicense}
\`\`\`
`;

const outputs = {
  "productTypes.json": productTypes,
  "landingLayouts.json": landingLayouts,
  "motionTiers.json": motionTiers,
  "styleSources.json": styleSources,
  "typographySources.json": typographySources,
  "fonts.json": fonts,
  "source.json": source,
};

const rendered = Object.entries(outputs).map(([file, value]) => [file, `${JSON.stringify(value, null, 2)}\n`]);
rendered.push(["ATTRIBUTION.md", attribution]);

if (checkOnly) {
  const stale = rendered
    .filter(([file, content]) => {
      const path = join(OUTPUT_DIR, file);
      return !existsSync(path) || readFileSync(path, "utf8") !== content;
    })
    .map(([file]) => file);
  if (stale.length > 0) fail(`data/ está desactualizado (${stale.join(", ")}). Corre \`pnpm --filter @dialmade/catalog etl\`.`);
  console.log("etl: data/ está al día.");
} else {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const [file, content] of rendered) writeFileSync(join(OUTPUT_DIR, file), content);
  console.log(
    `etl: ${productTypes.length} tipos de producto, ${landingLayouts.length} layouts, ${motionTiers.length} tiers de motion, ` +
      `${styleSources.length} estilos, ${typographySources.length} pairings de referencia y ${fonts.length} familias → data/`,
  );
}
