import type { Locale } from "@dialmade/catalog";
import type { ColorMode } from "@dialmade/palette";
import type { DesignDoc } from "../schema";
import { FONT_SIZE_NAMES, RADIUS_NAMES, SHADOW_NAMES, type DimensionRef, type ResolvedTokens } from "../tokens";
import { shadowCss } from "../compile";
import {
  SPACE_NAMES,
  kindLabel,
  mdTable,
  pageKinds,
  outlineItemLines,
  pageOutline,
  preferredMode,
  productLabel,
  resolveExport,
  sectionLabel,
  type ExportOptions,
} from "./shared";
import { toYaml, type YamlMap } from "./yaml";

export interface DesignMdOptions extends ExportOptions {
  /** Mode of the frontmatter colors (DESIGN.md has no modes). Defaults to the design's preferred mode. */
  mode?: ColorMode;
  /** Language of the prose. Defaults to `doc.brief.locale`. Token names are always English kebab-case. */
  locale?: Locale;
}

const ROLE_NOTES: Record<string, { es: string; en: string }> = {
  background: { es: "Fondo de página", en: "Page background" },
  foreground: { es: "Texto principal", en: "Body text" },
  card: { es: "Superficie de tarjetas, popovers y sidebar", en: "Cards, popovers and sidebar surface" },
  primary: { es: "Acciones principales (botón primario, enlaces activos)", en: "Primary actions (primary button, active links)" },
  "primary-foreground": { es: "Texto sobre primary", en: "Text on primary" },
  secondary: { es: "Botón secundario y chips", en: "Secondary button and chips" },
  muted: { es: "Fondos discretos", en: "Quiet backgrounds" },
  "muted-foreground": { es: "Texto secundario (AA sobre background, card y muted)", en: "Secondary text (AA on background, card and muted)" },
  accent: { es: "Superficie de hover (convención shadcn), no es el CTA", en: "Hover surface (shadcn convention), not the CTA" },
  destructive: { es: "Errores y acciones destructivas", en: "Errors and destructive actions" },
  border: { es: "Divisores decorativos", en: "Decorative dividers" },
  input: { es: "Borde de campos (3:1)", en: "Field borders (3:1)" },
  ring: { es: "Anillo de foco (3:1)", en: "Focus ring (3:1)" },
  brand: { es: "Color exacto de la marca. Decorativo: sin garantía de contraste", en: "Exact brand color. Decorative: no contrast guarantee" },
  cta: { es: "Llamada a la acción principal", en: "Main call to action" },
  "primary-text": { es: "Texto con color de marca (4.5:1 sobre background y card)", en: "Brand-colored text (4.5:1 on background and card)" },
  "border-strong": { es: "Borde de UI que cumple 3:1", en: "UI border that meets 3:1" },
  success: { es: "Éxito", en: "Success" },
  warning: { es: "Aviso", en: "Warning" },
  info: { es: "Información", en: "Info" },
};

const T = {
  es: {
    generated: "Generado por Dialmade desde un DesignDoc v1. Los valores son exactos: no los aproximes.",
    product: "Producto",
    focus: "Foco",
    pages: "Páginas",
    recipe: "Estilo",
    palette: "Estilo de paleta",
    dials: "Diales",
    defaultMode: "Modo por defecto",
    role: "Rol",
    light: "Claro",
    dark: "Oscuro",
    use: "Uso",
    colorsIntro:
      "Todos los pares de texto y UI cumplen WCAG 2.2 AA en los dos modos. Los nombres coinciden con las variables CSS (`--primary`) y con shadcn/ui.",
    scales: (names: string) => `Escalas 50–950 disponibles como \`--color-<escala>-<paso>\`: ${names}.`,
    token: "Token",
    size: "Tamaño",
    lineHeight: "Interlineado",
    weight: "Peso",
    tracking: "Tracking",
    typeIntro: (heading: string, body: string, url: string) =>
      `Títulos en **${heading}** y texto en **${body}** (Google Fonts: ${url}). Display y h1 son fluidos entre 375 px y 1280 px; la tabla muestra el máximo.`,
    spacingIntro: (density: number) =>
      `Escala de 10 pasos con base de 4 px, ajustada a densidad ${density}/10 (más densidad, menos aire). Variables \`--dl-space-1\`…\`--dl-space-10\`.`,
    container: "Ancho máximo del contenedor",
    sectionPy: "Padding vertical de sección",
    elevationIntro: (shadow: string, surface: string) => `Sombras «${shadow}» sobre superficies «${surface}».`,
    noShadows: "Este estilo no usa sombras: la profundidad sale de bordes, color y espacio.",
    shapesIntro: "Radios en px (variables `--dl-radius-*`); `full` es una píldora.",
    borderWidth: "Grosor de borde",
    component: "Componente",
    property: "Propiedad",
    value: "Valor",
    variable: "Variable",
    componentsIntro: "Tokens de componente compilados desde la receta y sus ajustes. Úsalos en lugar de valores literales.",
    motionIntro: (tier: string) => `Tier «${tier}». Respeta siempre \`prefers-reduced-motion\` (sustituye por fundidos o nada).`,
    dos: [
      "Usa las variables CSS (`var(--primary)`, `var(--dl-radius-md)`, `var(--dl-space-4)`) en lugar de valores literales.",
      "Usa `--primary-text` para texto con el color de marca sobre background o card.",
      "Reserva `--cta` para la acción principal de cada vista.",
      "Mantén la jerarquía con la escala tipográfica: un solo display por vista.",
    ],
    donts: [
      "No uses `--brand` para texto: es decorativo y no garantiza contraste.",
      "No inventes colores, radios ni sombras fuera de la escala.",
      "No uses `--accent` como color de CTA: en shadcn es la superficie de hover.",
      "No animes con GSAP ni superes la duración `slow`; no ignores reduced motion.",
    ],
    noShadowDont: "No añadas sombras: este estilo es plano.",
    pagesTitle: "Páginas",
    hidden: "oculta",
    doLabel: "Haz:",
    dontLabel: "Evita:",
  },
  en: {
    generated: "Generated by Dialmade from a DesignDoc v1. Values are exact: do not approximate them.",
    product: "Product",
    focus: "Focus",
    pages: "Pages",
    recipe: "Style",
    palette: "Palette style",
    dials: "Dials",
    defaultMode: "Default mode",
    role: "Role",
    light: "Light",
    dark: "Dark",
    use: "Use",
    colorsIntro:
      "Every text and UI pair meets WCAG 2.2 AA in both modes. Names match the CSS variables (`--primary`) and shadcn/ui.",
    scales: (names: string) => `50–950 scales available as \`--color-<scale>-<step>\`: ${names}.`,
    token: "Token",
    size: "Size",
    lineHeight: "Line height",
    weight: "Weight",
    tracking: "Tracking",
    typeIntro: (heading: string, body: string, url: string) =>
      `Headings in **${heading}**, text in **${body}** (Google Fonts: ${url}). Display and h1 are fluid between 375px and 1280px; the table shows the maximum.`,
    spacingIntro: (density: number) =>
      `A 10-step scale on a 4px base, tuned to density ${density}/10 (denser means less air). Variables \`--dl-space-1\`…\`--dl-space-10\`.`,
    container: "Container max width",
    sectionPy: "Section vertical padding",
    elevationIntro: (shadow: string, surface: string) => `"${shadow}" shadows on "${surface}" surfaces.`,
    noShadows: "This style uses no shadows: depth comes from borders, color and spacing.",
    shapesIntro: "Radii in px (`--dl-radius-*` variables); `full` is a pill.",
    borderWidth: "Border width",
    component: "Component",
    property: "Property",
    value: "Value",
    variable: "Variable",
    componentsIntro: "Component tokens compiled from the recipe and its overrides. Use them instead of literal values.",
    motionIntro: (tier: string) => `"${tier}" tier. Always honour \`prefers-reduced-motion\` (swap for fades or nothing).`,
    dos: [
      "Use the CSS variables (`var(--primary)`, `var(--dl-radius-md)`, `var(--dl-space-4)`) instead of literal values.",
      "Use `--primary-text` for brand-colored text on background or card.",
      "Keep `--cta` for the main action of each view.",
      "Keep hierarchy with the type scale: one display per view.",
    ],
    donts: [
      "Don't use `--brand` for text: it is decorative and has no contrast guarantee.",
      "Don't invent colors, radii or shadows outside the scale.",
      "Don't use `--accent` as the CTA color: in shadcn it is the hover surface.",
      "Don't animate with GSAP or beyond the `slow` duration; don't ignore reduced motion.",
    ],
    noShadowDont: "Don't add shadows: this style is flat.",
    pagesTitle: "Pages",
    hidden: "hidden",
    doLabel: "Do:",
    dontLabel: "Don't:",
  },
} as const;

const dimText = (value: DimensionRef) => (value.ref ? `${value.px}px (${value.ref})` : `${value.px}px`);

function frontmatter(doc: DesignDoc, t: ResolvedTokens, description: string): YamlMap {
  const colors: YamlMap = { ...t.colors };
  for (const [scale, steps] of Object.entries(t.scales)) {
    for (const [step, hex] of Object.entries(steps)) colors[`${scale}-${step}`] = hex;
  }
  const typography: YamlMap = {};
  for (const name of FONT_SIZE_NAMES) {
    const heading = name === "display" || name.startsWith("h");
    typography[name] = {
      fontFamily: (heading ? t.fonts.heading.family : t.fonts.body.family) ?? "system-ui",
      fontSize: `${t.fontSizes[name].px}px`,
      fontWeight: heading ? t.heading.weight : t.bodyWeight,
      lineHeight: heading ? t.lineHeights.tight : t.lineHeights.body,
      ...(heading && t.heading.tracking !== 0 && { letterSpacing: `${t.heading.tracking}em` }),
    };
  }
  typography.button = {
    fontFamily: t.fonts.body.family ?? "system-ui",
    fontSize: `${t.fontSizes.body.px}px`,
    fontWeight: t.components.button.weight,
    lineHeight: 1,
  };
  const rounded: YamlMap = {};
  for (const name of RADIUS_NAMES) rounded[name] = `${t.radius[name]}px`;
  const spacing: YamlMap = {};
  t.space.forEach((px, i) => (spacing[SPACE_NAMES[i]!] = `${px}px`));
  spacing.section = `${t.layout.sectionPy}px`;
  spacing.container = `${t.layout.container}px`;

  const radiusRef = (value: DimensionRef) => (value.ref?.startsWith("radius.") ? `{rounded.${value.ref.slice(7)}}` : `${value.px}px`);
  const spaceRef = (value: DimensionRef) =>
    value.ref?.startsWith("space.") ? `{spacing.${SPACE_NAMES[Number(value.ref.slice(6)) - 1]}}` : `${value.px}px`;
  const { button, card, input, badge, nav, table, sidebar } = t.components;
  const buttonBase = { typography: "{typography.button}", rounded: radiusRef(button.radius), padding: spaceRef(button.px), height: `${button.hMd}px` };

  return {
    version: "alpha",
    name: doc.brand.name,
    description,
    colors,
    typography,
    rounded,
    spacing,
    components: {
      "button-primary": { backgroundColor: "{colors.primary}", textColor: "{colors.primary-foreground}", ...buttonBase },
      "button-secondary": { backgroundColor: "{colors.secondary}", textColor: "{colors.secondary-foreground}", ...buttonBase },
      "button-cta": { backgroundColor: "{colors.cta}", textColor: "{colors.cta-foreground}", ...buttonBase },
      "button-sm": { height: `${button.hSm}px` },
      "button-lg": { height: `${button.hLg}px` },
      card: { backgroundColor: "{colors.card}", textColor: "{colors.card-foreground}", rounded: radiusRef(card.radius), padding: spaceRef(card.padding) },
      input: { backgroundColor: "{colors.background}", textColor: "{colors.foreground}", rounded: radiusRef(input.radius), height: `${input.h.px}px` },
      badge: { backgroundColor: "{colors.secondary}", textColor: "{colors.secondary-foreground}", rounded: radiusRef(badge.radius) },
      nav: { backgroundColor: "{colors.background}", textColor: "{colors.foreground}", height: `${nav.h}px` },
      "table-row": { height: `${table.rowH}px` },
      sidebar: { backgroundColor: "{colors.card}", textColor: "{colors.card-foreground}", width: `${sidebar.w}px` },
    },
  };
}

/**
 * DESIGN.md (Google's spec, alpha): YAML frontmatter with `colors`, `typography`, `rounded`,
 * `spacing` and `components` (kebab-case names, `#rrggbb`, px, `{group.token}` references), then
 * Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Motion and Do's and Don'ts.
 */
export function toDesignMd(doc: DesignDoc, options: DesignMdOptions = {}): string {
  const locale = options.locale ?? doc.brief.locale;
  const L = T[locale];
  const { inputs, light, dark } = resolveExport(doc, options);
  const mode = options.mode ?? preferredMode(inputs);
  const t = mode === "light" ? light : dark;
  const { recipe, pairing, motionTier, theme } = inputs;

  const description = doc.brand.tagline?.trim() || `${recipe.label[locale]} · ${productLabel(doc, locale)}`;
  const kinds = pageKinds(doc);
  const out: string[] = ["---", toYaml(frontmatter(doc, t, description)), "---", "", `# ${doc.brand.name}`, ""];

  out.push(
    "## Overview",
    "",
    ...(doc.brand.tagline ? [`> ${doc.brand.tagline}`, ""] : []),
    `${recipe.label[locale]}: ${recipe.description[locale]}`,
    "",
    `- ${L.product}: ${productLabel(doc, locale)}`,
    `- ${L.focus}: ${kindLabel(doc.brief.focus, locale)}`,
    ...(kinds.length > 0 ? [`- ${L.pages}: ${kinds.map((k) => kindLabel(k, locale)).join(", ")}`] : []),
    `- ${L.palette}: ${theme.styleId}`,
    `- ${L.dials}: variance ${t.dials.variance}/10 · motion ${t.dials.motion}/10 · density ${t.dials.density}/10`,
    `- ${L.defaultMode}: ${mode === "light" ? L.light : L.dark}`,
    "",
    L.generated,
    "",
  );

  out.push(
    "## Colors",
    "",
    L.colorsIntro,
    "",
    mdTable(
      [L.role, L.light, L.dark, L.use],
      Object.keys(light.colors).map((name) => [`\`${name}\``, light.colors[name]!, dark.colors[name]!, ROLE_NOTES[name]?.[locale] ?? ""]),
    ),
    "",
    L.scales(Object.keys(t.scales).join(", ")),
    "",
  );

  out.push(
    "## Typography",
    "",
    L.typeIntro(t.fonts.heading.family ?? "system-ui", t.fonts.body.family ?? "system-ui", pairing.googleFontsUrl),
    "",
    mdTable(
      [L.token, L.size, L.lineHeight, L.weight, L.tracking],
      FONT_SIZE_NAMES.map((name) => {
        const heading = name === "display" || name.startsWith("h");
        const size = t.fontSizes[name];
        return [
          `\`${name}\` (\`--dl-fs-${name}\`)`,
          size.minPx < size.px ? `${size.minPx}–${size.px}px` : `${size.px}px`,
          heading ? t.lineHeights.tight : t.lineHeights.body,
          heading ? t.heading.weight : t.bodyWeight,
          heading ? `${t.heading.tracking}em` : "0",
        ];
      }),
    ),
    "",
  );

  out.push(
    "## Layout",
    "",
    L.spacingIntro(t.dials.density),
    "",
    mdTable([L.token, L.value, L.variable], t.space.map((px, i) => [SPACE_NAMES[i]!, `${px}px`, `--dl-space-${i + 1}`])),
    "",
    `- ${L.container}: ${t.layout.container}px (\`--dl-container\`)`,
    `- ${L.sectionPy}: ${t.layout.sectionPy}px (\`--dl-section-py\`)`,
    "",
  );

  const flat = SHADOW_NAMES.every((name) => t.shadows[name].length === 0);
  out.push(
    "## Elevation & Depth",
    "",
    flat ? L.noShadows : L.elevationIntro(recipe.shadow, recipe.surface),
    "",
    ...(flat
      ? []
      : [mdTable([L.token, L.light, L.dark], SHADOW_NAMES.map((name) => [`\`--dl-shadow-${name}\``, shadowCss(light.shadows[name]), shadowCss(dark.shadows[name])])), ""]),
  );

  out.push(
    "## Shapes",
    "",
    L.shapesIntro,
    "",
    mdTable([L.token, L.value], RADIUS_NAMES.map((name) => [`\`--dl-radius-${name}\``, `${t.radius[name]}px`])),
    "",
    `- ${L.borderWidth}: ${t.borderWidth}px (\`--dl-border-width\`)`,
    "",
  );

  const { button, card, input, badge, nav, table, sidebar } = t.components;
  const shadowText = (ref: string) => (ref === "none" ? "none" : `--dl-shadow-${ref}`);
  out.push(
    "## Components",
    "",
    L.componentsIntro,
    "",
    mdTable(
      [L.component, L.property, L.value, L.variable],
      [
        ["Button", "radius", dimText(button.radius), "--dl-button-radius"],
        ["Button", "height sm / md / lg", `${button.hSm} / ${button.hMd} / ${button.hLg}px`, "--dl-button-h-sm/-md/-lg"],
        ["Button", "padding-x", dimText(button.px), "--dl-button-px"],
        ["Button", "font-weight", button.weight, "--dl-button-weight"],
        ["Button", "shadow", shadowText(button.shadow), "--dl-button-shadow"],
        ["Card", "radius", dimText(card.radius), "--dl-card-radius"],
        ["Card", "padding", dimText(card.padding), "--dl-card-padding"],
        ["Card", "shadow", shadowText(card.shadow), "--dl-card-shadow"],
        ["Card", "border", card.border ? `${card.border.width}px solid --${card.border.color}` : "none", "--dl-card-border"],
        ["Input", "radius", dimText(input.radius), "--dl-input-radius"],
        ["Input", "height", `${input.h.px}px`, "--dl-input-h"],
        ["Badge", "radius", dimText(badge.radius), "--dl-badge-radius"],
        ["Nav", "height", `${nav.h}px`, "--dl-nav-h"],
        ["Table", "row height", `${table.rowH}px`, "--dl-table-row-h"],
        ["Sidebar", "width", `${sidebar.w}px`, "--dl-sidebar-w"],
      ].map(([c, p, v, name]) => [c!, p!, v!, `\`${name}\``]),
    ),
    "",
  );

  out.push(
    "## Motion",
    "",
    L.motionIntro(motionTier.label[locale]),
    "",
    mdTable(
      [L.token, L.value],
      [
        ["`--dl-duration-fast`", `${t.motion.fast}ms`],
        ["`--dl-duration-base`", `${t.motion.base}ms`],
        ["`--dl-duration-slow`", `${t.motion.slow}ms`],
        ["`--dl-ease`", t.motion.ease],
      ],
    ),
    "",
  );

  if (kinds.length > 0) {
    out.push(`## ${L.pagesTitle}`, "");
    for (const kind of kinds) {
      const page = doc.pages[kind]!;
      out.push(`### ${kindLabel(kind, locale)} (\`${page.layoutId}\`)`, "");
      for (const item of pageOutline(doc, page)) {
        out.push(...outlineItemLines(item, `- ${sectionLabel(item.type, locale)} (\`${item.type}\`)`, "  ".repeat(item.depth), L.hidden));
      }
      out.push("");
    }
  }

  out.push(
    "## Do's and Don'ts",
    "",
    ...L.dos.map((line) => `- **${L.doLabel}** ${line}`),
    ...[...L.donts, ...(flat ? [L.noShadowDont] : [])].map((line) => `- **${L.dontLabel}** ${line}`),
    "",
  );

  return out.join("\n");
}
