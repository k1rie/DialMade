// Lector de los presets de tweakcn (Apache-2.0): `utils/theme-presets.ts`.
// Se lee con el AST de TypeScript y no se evalúa: el archivo es un literal de objeto y nada más.
import { readFileSync } from "node:fs";

import ts from "typescript";

import { toHex6 } from "./color.mjs";

const REM = 16;

function literal(node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isObjectLiteralExpression(node)) {
    const out = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) throw new Error(`tweakcn: propiedad no soportada (${ts.SyntaxKind[property.kind]})`);
      out[property.name.text] = literal(property.initializer);
    }
    return out;
  }
  throw new Error(`tweakcn: valor no literal (${ts.SyntaxKind[node.kind]}): ${node.getText()}`);
}

function readPresets(file) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let presets;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText() === "defaultPresets" && node.initializer) {
      presets = literal(node.initializer);
    } else {
      ts.forEachChild(node, visit);
    }
  };
  visit(source);
  if (!presets) throw new Error("tweakcn: no encuentro `defaultPresets` en theme-presets.ts");
  return presets;
}

function px(value, name) {
  const text = String(value).trim();
  const match = /^(-?[\d.]+)(rem|px|em)?$/.exec(text);
  if (!match) throw new Error(`tweakcn ${name}: longitud no reconocida «${value}»`);
  const amount = Number.parseFloat(match[1]);
  return match[2] === "rem" || match[2] === "em" ? amount * REM : amount;
}

/** Primera familia de una pila CSS: `"Inter, sans-serif"` → `Inter`. */
function family(stack) {
  if (!stack) return undefined;
  const first = String(stack).split(",")[0].trim().replace(/^['"]|['"]$/g, "");
  return first && !/^(sans-serif|serif|monospace|system-ui|ui-[a-z-]+)$/i.test(first) ? first : undefined;
}

const round = (value, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;

const COLOR_ROLES = {
  background: "background",
  foreground: "foreground",
  card: "card",
  cardForeground: "card-foreground",
  primary: "primary",
  primaryForeground: "primary-foreground",
  secondary: "secondary",
  secondaryForeground: "secondary-foreground",
  muted: "muted",
  mutedForeground: "muted-foreground",
  accent: "accent",
  accentForeground: "accent-foreground",
  border: "border",
  destructive: "destructive",
  destructiveForeground: "destructive-foreground",
};

function colorsOf(variant, label, mode) {
  const colors = {};
  for (const [role, key] of Object.entries(COLOR_ROLES)) {
    if (variant[key] === undefined) {
      if (role === "destructiveForeground") continue;
      throw new Error(`tweakcn ${label} (${mode}): falta «${key}»`);
    }
    colors[role] = toHex6(variant[key]);
  }
  const chart = [1, 2, 3, 4, 5].map((index) => variant[`chart-${index}`]).filter((value) => value !== undefined);
  if (chart.length === 5) colors.chart = chart.map((value) => toHex6(value));
  return colors;
}

function shadowOf(variant) {
  if (variant["shadow-opacity"] === undefined) return undefined;
  return {
    color: variant["shadow-color"] === undefined ? "#000000" : toHex6(variant["shadow-color"]),
    opacity: round(Number(variant["shadow-opacity"]), 3),
    blur: round(px(variant["shadow-blur"] ?? "0px", "shadow-blur"), 1),
    spread: round(px(variant["shadow-spread"] ?? "0px", "shadow-spread"), 1),
    x: round(px(variant["shadow-offset-x"] ?? "0px", "shadow-offset-x"), 1),
    y: round(px(variant["shadow-offset-y"] ?? "0px", "shadow-offset-y"), 1),
  };
}

export function readTweakcnPresets(file) {
  const presets = readPresets(file);
  return Object.entries(presets).map(([key, preset]) => {
    const light = preset.styles?.light;
    const dark = preset.styles?.dark;
    if (!light || !dark) throw new Error(`tweakcn ${key}: falta la variante light o dark`);

    const fonts = {
      sans: family(light["font-sans"]),
      serif: family(light["font-serif"]),
      mono: family(light["font-mono"]),
    };
    for (const name of Object.keys(fonts)) if (!fonts[name]) delete fonts[name];

    const tracking = light["letter-spacing"];
    const result = {
      key,
      label: preset.label,
      colors: { light: colorsOf(light, key, "light"), dark: colorsOf(dark, key, "dark") },
      radius: px(light.radius ?? "0.5rem", `${key} radius`),
      fonts,
    };
    const shadow = shadowOf(light);
    if (shadow) result.shadow = shadow;
    if (tracking !== undefined && tracking !== "normal") {
      // «-0.025em» → -0.025. En px se aproxima contra 16 px (solo aparece en presets de display).
      const value = String(tracking).trim();
      result.tracking = round(value.endsWith("px") ? Number.parseFloat(value) / REM : Number.parseFloat(value), 3);
    }
    if (light.spacing !== undefined) result.spacing = round(px(light.spacing, `${key} spacing`) / REM, 3);
    return result;
  });
}
