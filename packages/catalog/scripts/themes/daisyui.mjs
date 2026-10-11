// Lector de los temas de daisyUI (MIT): `packages/daisyui/src/themes/<nombre>.css`.
// Cada archivo es una lista plana `--variable: valor;` más `color-scheme`. No se ejecuta nada: es texto.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { mixHex, toHex6 } from "./color.mjs";

const REM = 16;

function length(value, name) {
  const match = /^(-?[\d.]+)(rem|px)?$/.exec(value.trim());
  if (!match) throw new Error(`daisyUI ${name}: longitud no reconocida «${value}»`);
  const amount = Number.parseFloat(match[1]);
  return match[2] === "px" ? amount : amount * REM;
}

export function readDaisyThemes(themesDir) {
  const themes = [];
  for (const file of readdirSync(themesDir).filter((name) => name.endsWith(".css")).sort()) {
    const css = readFileSync(join(themesDir, file), "utf8");
    const vars = {};
    for (const match of css.matchAll(/(--[a-z0-9-]+|color-scheme)\s*:\s*([^;]+);/g)) vars[match[1]] = match[2].trim();

    const key = file.replace(/\.css$/, "");
    const scheme = vars["color-scheme"];
    if (scheme !== "light" && scheme !== "dark") throw new Error(`daisyUI ${key}: color-scheme «${scheme}»`);

    const color = (name) => {
      const raw = vars[`--color-${name}`];
      if (!raw) throw new Error(`daisyUI ${key}: falta --color-${name}`);
      return toHex6(raw);
    };

    const background = color("base-100");
    const foreground = color("base-content");
    const muted = color("base-200");

    themes.push({
      key,
      scheme,
      colors: {
        background,
        foreground,
        card: background,
        cardForeground: foreground,
        primary: color("primary"),
        primaryForeground: color("primary-content"),
        secondary: color("secondary"),
        secondaryForeground: color("secondary-content"),
        muted,
        // daisyUI no define un texto atenuado: se mezcla el texto con la superficie.
        mutedForeground: mixHex(foreground, muted, 0.4),
        accent: color("accent"),
        accentForeground: color("accent-content"),
        border: color("base-300"),
        destructive: color("error"),
        destructiveForeground: color("error-content"),
        success: color("success"),
        warning: color("warning"),
        info: color("info"),
      },
      radius: {
        selector: length(vars["--radius-selector"] ?? "0.5rem", `${key} radius-selector`),
        field: length(vars["--radius-field"] ?? "0.25rem", `${key} radius-field`),
        box: length(vars["--radius-box"] ?? "0.5rem", `${key} radius-box`),
      },
      border: length(vars["--border"] ?? "1px", `${key} border`),
      depth: Number.parseInt(vars["--depth"] ?? "0", 10) === 1 ? 1 : 0,
      noise: Number.parseInt(vars["--noise"] ?? "0", 10) === 1 ? 1 : 0,
    });
  }
  return themes;
}
