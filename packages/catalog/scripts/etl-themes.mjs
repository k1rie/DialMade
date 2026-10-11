#!/usr/bin/env node
// ETL: vendor/daisyui (MIT) y vendor/tweakcn (Apache-2.0) → packages/catalog/data/themePresets.json.
// Uso: node scripts/etl-themes.mjs          regenera data/
//      node scripts/etl-themes.mjs --check  falla si data/ no coincide con lo que generaría
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DAISYUI_LABELS, DROPPED_TWEAKCN, titleCase } from "./curation/themes.mjs";
import { readDaisyThemes } from "./themes/daisyui.mjs";
import { readTweakcnPresets } from "./themes/tweakcn.mjs";

const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PACKAGE_DIR, "../..");
const VENDOR_DIR = process.env.VENDOR_DIR ? resolve(process.env.VENDOR_DIR) : join(REPO_ROOT, "vendor");
const OUTPUT_DIR = join(PACKAGE_DIR, "data");

const DAISYUI = {
  dir: join(VENDOR_DIR, "daisyui"),
  url: "https://github.com/saadeghi/daisyui",
  commit: "8c24218588f34a678f48df435950790b57ef2bf7",
  license: "MIT",
  themes: "packages/daisyui/src/themes",
  expected: 35,
};
const TWEAKCN = {
  dir: join(VENDOR_DIR, "tweakcn"),
  url: "https://github.com/jnsahaj/tweakcn",
  commit: "a3b47b37cba97dd637de517aab52c45ec0f83456",
  license: "Apache-2.0",
  file: "utils/theme-presets.ts",
  expected: 42,
};

const checkOnly = process.argv.includes("--check");

function fail(message) {
  console.error(`etl-themes: ${message}`);
  process.exit(1);
}

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

function commitOf(source) {
  try {
    return execFileSync("git", ["-C", source.dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return source.commit;
  }
}

const daisyThemesDir = join(DAISYUI.dir, DAISYUI.themes);
const tweakcnFile = join(TWEAKCN.dir, TWEAKCN.file);
for (const path of [daisyThemesDir, tweakcnFile]) {
  if (!existsSync(path)) fail(`no encuentro ${path}.\n  corre \`bash scripts/fetch-vendor.sh\` desde la raíz y vuelve a intentarlo.`);
}
for (const source of [DAISYUI, TWEAKCN]) {
  const commit = commitOf(source);
  if (commit !== source.commit) console.warn(`etl-themes: aviso, ${source.dir} está en ${commit} y el commit fijado es ${source.commit}.`);
}

// ---------------------------------------------------------------- daisyUI

const daisy = readDaisyThemes(daisyThemesDir);
if (daisy.length !== DAISYUI.expected) fail(`daisyUI: esperaba ${DAISYUI.expected} temas y leí ${daisy.length}.`);

const daisyPresets = daisy.map((theme) => ({
  id: `daisyui-${theme.key}`,
  label: DAISYUI_LABELS[theme.key] ?? titleCase(theme.key),
  source: "daisyui",
  sourceKey: theme.key,
  modes: [theme.scheme],
  colors: { [theme.scheme]: theme.colors },
  radius: theme.radius,
  border: theme.border,
  depth: theme.depth,
  noise: theme.noise,
}));

// ---------------------------------------------------------------- tweakcn

const tweakcn = readTweakcnPresets(tweakcnFile);
if (tweakcn.length !== TWEAKCN.expected) fail(`tweakcn: esperaba ${TWEAKCN.expected} presets y leí ${tweakcn.length}.`);
for (const key of Object.keys(DROPPED_TWEAKCN)) {
  if (!tweakcn.some((preset) => preset.key === key)) fail(`tweakcn: «${key}» está en la lista de descartes y ya no existe; revisa curation/themes.mjs.`);
}

const round = (value) => Math.round(value * 10) / 10;
const tweakcnPresets = tweakcn
  .filter((preset) => !(preset.key in DROPPED_TWEAKCN))
  .map((preset) => ({
    id: `tweakcn-${preset.key}`,
    label: preset.label,
    source: "tweakcn",
    sourceKey: preset.key,
    modes: ["light", "dark"],
    colors: preset.colors,
    // shadcn deriva sus radios de un único `--radius`: sm = r − 4, md = r − 2, lg = r.
    radius: {
      selector: Math.max(0, round(preset.radius - 4)),
      field: Math.max(0, round(preset.radius - 2)),
      box: round(preset.radius),
    },
    border: 1,
    ...(preset.fonts && Object.keys(preset.fonts).length > 0 && { fonts: preset.fonts }),
    ...(preset.shadow && { shadow: preset.shadow }),
    ...(preset.tracking !== undefined && { tracking: preset.tracking }),
    ...(preset.spacing !== undefined && { spacing: preset.spacing }),
  }));

const presets = [...daisyPresets, ...tweakcnPresets].sort((a, b) => a.id.localeCompare(b.id));
const ids = presets.map((preset) => preset.id);
if (new Set(ids).size !== ids.length) fail("hay ids de tema repetidos.");

// ---------------------------------------------------------------- salida

const daisyFiles = readdirSync(daisyThemesDir)
  .filter((name) => name.endsWith(".css"))
  .sort();
const source = {
  generator: "packages/catalog/scripts/etl-themes.mjs",
  count: presets.length,
  sources: {
    daisyui: {
      upstream: DAISYUI.url,
      commit: DAISYUI.commit,
      license: DAISYUI.license,
      path: `${DAISYUI.themes}/*.css`,
      themes: daisy.length,
      sha256: sha256(daisyFiles.map((name) => readFileSync(join(daisyThemesDir, name), "utf8")).join("\n")),
    },
    tweakcn: {
      upstream: TWEAKCN.url,
      commit: TWEAKCN.commit,
      license: TWEAKCN.license,
      path: TWEAKCN.file,
      presets: tweakcn.length,
      kept: tweakcnPresets.length,
      sha256: sha256(readFileSync(tweakcnFile, "utf8")),
    },
  },
  dropped: { tweakcn: DROPPED_TWEAKCN },
};

const daisyLicense = readFileSync(join(DAISYUI.dir, "LICENSE"), "utf8").trim();
const tweakcnLicense = readFileSync(join(TWEAKCN.dir, "LICENSE"), "utf8").trim();

const attribution = `# Atribución de los temas / Theme attribution

\`themePresets.json\` se genera con \`scripts/etl-themes.mjs\` a partir de dos proyectos de código abierto.
No se incluyen sus repositorios: \`scripts/fetch-vendor.sh\` los descarga en \`vendor/\` al commit indicado.

\`themePresets.json\` is generated by \`scripts/etl-themes.mjs\` from two open-source projects.
Their repositories are not included: \`scripts/fetch-vendor.sh\` downloads them into \`vendor/\` at the pinned commit.

## daisyUI (${DAISYUI.license})

- Repositorio / Repository: ${DAISYUI.url}
- Commit: \`${DAISYUI.commit}\`
- Archivos de origen / Source files: \`${DAISYUI.themes}/*.css\` (${daisy.length} temas / themes)

## tweakcn (${TWEAKCN.license})

- Repositorio / Repository: ${TWEAKCN.url}
- Commit: \`${TWEAKCN.commit}\`
- Archivo de origen / Source file: \`${TWEAKCN.file}\` (${tweakcn.length} presets, de los que se conservan ${tweakcnPresets.length})

## Cambios / Changes (Apache-2.0 §4)

Los datos se han modificado respecto a los originales:

- Todos los colores se convierten a hex sRGB (los \`oklch()\` fuera de gama bajan de croma en lugar de recortarse).
- Los roles de color se unifican (\`background\`, \`foreground\`, \`primary\`…). En daisyUI, \`muted-foreground\` se calcula mezclando el texto con la superficie.
- Los radios pasan a píxeles. tweakcn solo define un \`--radius\`: \`selector\`, \`field\` y \`box\` se derivan como lo hace shadcn (r − 4, r − 2, r).
- Se descartan de tweakcn los presets que llevan nombre de marca o producto: ${Object.keys(DROPPED_TWEAKCN).join(", ")}.
- Se eliminan los tokens de \`sidebar-*\`, \`popover\`, \`input\` y \`ring\`.

The data has been modified from the originals: colors converted to sRGB hex (out-of-gamut \`oklch()\` values lose chroma
instead of being clipped), roles unified, radii in pixels (tweakcn's single \`--radius\` is expanded the way shadcn does),
brand- and product-named tweakcn presets dropped, and \`sidebar-*\`, \`popover\`, \`input\` and \`ring\` tokens removed.

## Licencias / Licenses

### daisyUI

\`\`\`
${daisyLicense}
\`\`\`

### tweakcn

\`\`\`
${tweakcnLicense}
\`\`\`
`;

// Sin colores: es lo que necesita el compilador de tokens (`resolveThemeInputs`) y entra en el bundle principal.
const shapes = presets.map(({ colors: _colors, ...shape }) => shape);

const outputs = [
  ["themePresets.json", `${JSON.stringify(presets, null, 2)}\n`],
  ["themeShapes.json", `${JSON.stringify(shapes)}\n`],
  ["themeSource.json", `${JSON.stringify(source, null, 2)}\n`],
  ["ATTRIBUTION-THEMES.md", attribution],
];

if (checkOnly) {
  const stale = outputs
    .filter(([file, content]) => {
      const path = join(OUTPUT_DIR, file);
      return !existsSync(path) || readFileSync(path, "utf8") !== content;
    })
    .map(([file]) => file);
  if (stale.length > 0) fail(`data/ está desactualizado (${stale.join(", ")}). Corre \`pnpm --filter @dialmade/catalog etl\`.`);
  console.log("etl-themes: data/ está al día.");
} else {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const [file, content] of outputs) writeFileSync(join(OUTPUT_DIR, file), content);
  console.log(
    `etl-themes: ${daisyPresets.length} de daisyUI + ${tweakcnPresets.length} de tweakcn ` +
      `(${Object.keys(DROPPED_TWEAKCN).length} descartados) = ${presets.length} temas → data/themePresets.json`,
  );
}
