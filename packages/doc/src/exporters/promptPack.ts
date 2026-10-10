import type { Locale } from "@dialmade/catalog";
import { shadowCss } from "../compile";
import { EXPORT_FILES } from "../constants";
import { createPage } from "../doc";
import type { DesignDoc, Page } from "../schema";
import { hasScreens, renderTargets } from "../screens";
import { FONT_SIZE_NAMES, RADIUS_NAMES, SHADOW_NAMES, fontsUrlFor, type ResolvedTokens } from "../tokens";
import { plainText, screenNames, screensLayoutLines } from "./layoutBlock";
import {
  kindLabel,
  mdTable,
  pageKinds,
  outlineItemLines,
  pageOutline,
  productLabel,
  resolveExport,
  sectionLabel,
  type ExportOptions,
} from "./shared";
import { toThemeCss } from "./themeCss";

export const PROMPT_TARGETS = ["claude", "claude-design", "framer", "figma", "v0", "cursor"] as const;
export type PromptTarget = (typeof PROMPT_TARGETS)[number];

interface Ctx {
  name: string;
  focus: string;
  fontsUrl: string;
  heading: string;
  body: string;
  fast: number;
  base: number;
  slow: number;
  ease: string;
}

interface TargetCopy {
  title: (c: Ctx) => string;
  before: (c: Ctx) => string[];
  task: (c: Ctx) => string;
  steps: (c: Ctx) => string[];
}

type Copy = {
  targets: Record<PromptTarget, TargetCopy>;
  beforeTitle: string;
  stepsTitle: string;
  briefTitle: string;
  brand: string;
  name: string;
  tagline: string;
  product: string;
  focus: string;
  style: string;
  palette: string;
  colors: string;
  colorsNote: string;
  role: string;
  light: string;
  dark: string;
  type: string;
  headingFont: string;
  bodyFont: string;
  scale: string;
  fluidFrom: string;
  shape: string;
  radius: string;
  spacing: (density: number) => string;
  container: string;
  sectionPy: string;
  borderWidth: string;
  shadows: string;
  flat: string;
  components: string;
  motion: string;
  reducedMotion: string;
  pages: string;
  customLayout: string;
  hidden: string;
  /** Extra step for documents with screens (before the last step); `routesFigma` for the Figma target. */
  routes: string;
  routesFigma: string;
  rulesTitle: string;
  rules: string[];
  filesTitle: string;
  files: Record<keyof typeof EXPORT_FILES, string>;
  appendixCss: string;
  appendixRule: string;
  ruleDescription: (name: string) => string;
  ruleSource: string;
};

const ES: Copy = {
  targets: {
    claude: {
      title: (c) => `${c.name}: dirección de diseño para Claude`,
      before: () => [
        `Pégalo en Claude (claude.ai o Claude Code) y adjunta \`${EXPORT_FILES.themeCss}\` y \`${EXPORT_FILES.designMd}\` del pack exportado.`,
      ],
      task: (c) =>
        `Construye «${c.focus}» para ${c.name} con React y Tailwind CSS v4 (y shadcn/ui si el proyecto lo usa), siguiendo esta dirección de diseño al pie de la letra.`,
      steps: (c) => [
        `Añade \`${EXPORT_FILES.themeCss}\` a la hoja global, después de \`@import "tailwindcss";\`, y mapea los tokens con \`@theme inline\` (\`--color-primary: var(--primary)\`, \`--radius-md: var(--dl-radius-md)\`, \`--font-heading: var(--dl-font-heading)\`).`,
        `Carga las fuentes: \`<link rel="stylesheet" href="${c.fontsUrl}">\` (o next/font con las mismas familias y pesos).`,
        "Construye las secciones de «Páginas» en ese orden, una por componente, con los textos indicados.",
        "Da estilo solo con las variables: `var(--primary)`, `var(--dl-button-radius)`, `var(--dl-space-4)`, `var(--dl-card-shadow)`, `var(--dl-duration-base)` y `var(--dl-ease)`.",
        "Haz que funcionen el modo claro y el oscuro (clase `.dark`) y comprueba el contraste AA y `prefers-reduced-motion`.",
      ],
    },
    "claude-design": {
      title: (c) => `${c.name}: design system para Claude Design`,
      before: () => [
        `En Claude, crea un artifact de tipo Design System (Claude Design) y sube del pack exportado: \`${EXPORT_FILES.designMd}\`, \`${EXPORT_FILES.themeCss}\`, \`${EXPORT_FILES.dtcg}\`, los logos y \`preview.html\` si lo tienes. Después pega este texto.`,
      ],
      task: (c) => `Crea el design system de ${c.name} a partir de los archivos subidos y, con él, «${c.focus}».`,
      steps: (c) => [
        `Lee los colores de las custom properties de \`${EXPORT_FILES.themeCss}\` (\`:root\` = claro, \`.dark\` = oscuro). Usa \`${EXPORT_FILES.dtcg}\` (DTCG) solo para contrastar.`,
        "Respeta los hex y los roles exactos. No crees colores nuevos ni ajustes el contraste.",
        `Tipografía: ${c.heading} para títulos y ${c.body} para texto (${c.fontsUrl}), con la escala de abajo.`,
        "Componentes: Button (primary, secondary y cta; sm, md y lg), Card, Input, Badge, Nav, fila de tabla y Sidebar, con los tokens de componente de abajo.",
        `Construye la preview de «${c.focus}» con las secciones de «Páginas».`,
        `Documenta las reglas de \`${EXPORT_FILES.designMd}\` (qué hacer y qué evitar).`,
      ],
    },
    framer: {
      title: (c) => `${c.name}: prompt para Framer (external agents)`,
      before: () => [
        "Necesitas un proyecto de Framer con External Agents (preview gratuita en los planes Basic y Pro) y Node 22 o superior.",
        "En una terminal ejecuta `npx @framer/agent@latest setup` y aprueba la conexión en el navegador.",
        "Abre Claude Code, ejecuta `/framer` y pega este texto.",
      ],
      task: (c) => `Con las herramientas del agente de Framer, construye «${c.focus}» para ${c.name} en el proyecto de Framer abierto.`,
      steps: (c) => [
        "Crea un color style por cada rol de la tabla, con su valor claro y oscuro.",
        "Crea los text styles Display, H1, H2, H3, Body, Small y Caption con las familias, tamaños, pesos, interlineados y tracking de abajo (son Google Fonts disponibles en Framer).",
        "Construye cada sección de «Páginas» en orden como un stack responsive (contenedor de escritorio, tablet y móvil) con los radios, espaciados y sombras de abajo.",
        `Para las interacciones usa los efectos de Framer o code components con \`framer-motion\` (Framer lo incluye): ${c.fast}/${c.base}/${c.slow} ms y curva \`${c.ease}\`. Nada de GSAP.`,
        "Enséñame el resultado antes de publicar. No publiques sin mi aprobación.",
      ],
    },
    figma: {
      title: (c) => `${c.name}: llevarlo a Figma con Claude Code`,
      before: () => [
        "Necesitas Claude Code con el servidor MCP de Figma conectado y acceso de edición al archivo. `generate_figma_design` solo funciona desde Claude Code o un IDE (no desde Claude Desktop) y `use_figma` está en beta. Para escribir fuera de drafts hace falta un seat Full.",
        `Sin Claude: arrastra \`${EXPORT_FILES.figmaLight}\` y \`${EXPORT_FILES.figmaDark}\` al panel Variables (una colección con dos modos; en Starter, dos colecciones).`,
      ],
      task: (c) => `Recrea en Figma la dirección de diseño de ${c.name}: primero las variables y luego «${c.focus}» como capas editables.`,
      steps: (c) => [
        `Variables: con \`use_figma\`, crea la colección «${c.name}» con los modos Light y Dark. Añade una variable de color por rol (\`color/primary\`…) desde \`${EXPORT_FILES.figmaLight}\` y \`${EXPORT_FILES.figmaDark}\`, y las variables numéricas de \`${EXPORT_FILES.figmaNumbers}\` (\`radius/*\`, \`space/*\`, \`component/button/radius\`…) con los scopes de \`com.figma.scopes\`.`,
        "Pon a cada variable su code syntax web con el nombre CSS (`var(--primary)`, `var(--dl-radius-md)`).",
        `Capas: sirve el pack HTML en local (\`npx serve .\` en la carpeta del pack) y usa \`generate_figma_design\` sobre \`http://localhost:3000\` para capturar «${c.focus}» como capas en una página nueva.`,
        "Enlaza las capas capturadas con las variables cuando coincidan: rellenos a `color/*`, radios a `radius/*` y gaps a `space/*`.",
        "Crea una página «Style Guide» con los text styles de la escala y los effect styles de las sombras de abajo. Las sombras y las curvas de motion no pueden ser variables.",
      ],
    },
    v0: {
      title: (c) => `${c.name}: prompt para v0`,
      before: () => ["Pégalo en v0. v0 no aplica los cssVars de un registry, así que el tema viaja dentro de este prompt."],
      task: (c) => `Construye «${c.focus}» para ${c.name} en Next.js con shadcn/ui y Tailwind CSS v4.`,
      steps: (c) => [
        "Sustituye los bloques `:root` y `.dark` de `app/globals.css` por el CSS del final y mapea los tokens en `@theme inline` (`--color-primary: var(--primary)`…).",
        `Carga las fuentes con \`next/font/google\`: ${c.heading} y ${c.body}.`,
        "Usa los componentes de shadcn/ui y da radios, alturas y paddings con las variables `--dl-*` (por ejemplo `rounded-[var(--dl-button-radius)] h-[var(--dl-button-h-md)]`).",
        "Construye las secciones de «Páginas» en orden, con los textos indicados.",
        "Los modos claro y oscuro tienen que funcionar. Respeta `prefers-reduced-motion`.",
      ],
    },
    cursor: {
      title: (c) => `${c.name}: prompt para Cursor`,
      before: () => [
        `Guarda \`${EXPORT_FILES.designMd}\` en la raíz del repo y \`${EXPORT_FILES.themeCss}\` junto a tu hoja global. Después pega este texto en el Agent de Cursor.`,
      ],
      task: (c) => `Implementa «${c.focus}» para ${c.name} siguiendo \`${EXPORT_FILES.designMd}\` y la regla \`.cursor/rules/dialmade-design.mdc\`.`,
      steps: (c) => [
        "Crea `.cursor/rules/dialmade-design.mdc` con el contenido del final.",
        `Importa \`${EXPORT_FILES.themeCss}\` en la hoja global y mapea los tokens con \`@theme inline\` de Tailwind v4.`,
        `Carga las fuentes (${c.fontsUrl}).`,
        "Construye las secciones de «Páginas» en orden, una por componente.",
        "No escribas colores, radios ni sombras literales: usa siempre las variables.",
      ],
    },
  },
  beforeTitle: "Antes de empezar",
  stepsTitle: "Pasos",
  briefTitle: "Dirección de diseño",
  brand: "Marca",
  name: "Nombre",
  tagline: "Tagline",
  product: "Producto",
  focus: "Foco",
  style: "Estilo",
  palette: "Estilo de paleta",
  colors: "Colores",
  colorsNote: "Hex exactos por rol (los nombres son las variables CSS). Todos los pares de texto y UI cumplen AA.",
  role: "Rol",
  light: "Claro",
  dark: "Oscuro",
  type: "Tipografía",
  headingFont: "Títulos",
  bodyFont: "Texto",
  scale: "Escala",
  fluidFrom: "fluido desde",
  shape: "Forma, espacio y elevación",
  radius: "Radios",
  spacing: (density) => `Espaciado (densidad ${density}/10)`,
  container: "Contenedor",
  sectionPy: "Padding de sección",
  borderWidth: "Borde",
  shadows: "Sombras (modo claro)",
  flat: "ninguna: estilo plano",
  components: "Componentes",
  motion: "Motion",
  reducedMotion: "Respeta `prefers-reduced-motion`.",
  pages: "Páginas",
  customLayout: "Layout propio",
  hidden: "oculta",
  routes:
    "Una ruta por pantalla, enlazadas como en el flujo («Pantallas y flujo»): cada bloque que «enlaza a» otra pantalla lleva a ella y la navegación de app enlaza sus pantallas. Respeta el wireframe, el orden de lectura y las reglas de tablet y móvil de cada pantalla.",
  routesFigma:
    "Una ruta por pantalla en el pack HTML: captura cada pantalla de «Pantallas y flujo» como un frame, en el orden del flujo, y enlázalas como prototipo según los enlaces.",
  rulesTitle: "Reglas",
  rules: [
    "Usa los hex y los roles exactos. No inventes colores, fuentes, radios ni sombras.",
    "`--brand` es decorativo: para texto con color de marca usa `--primary-text`.",
    "`--cta` solo para la acción principal de cada vista. `--accent` es la superficie de hover, no el CTA.",
    "Un solo display por vista; la jerarquía sale de la escala tipográfica.",
    "Anima con CSS o Motion (motion.dev), nunca con GSAP, y sin pasar de la duración `slow`.",
  ],
  filesTitle: "Archivos del pack",
  files: {
    themeCss: "todas las variables CSS (`:root` y `.dark`)",
    dtcg: "tokens DTCG 2025.10 (color, tipografía, dimensiones, sombras, duraciones y componentes)",
    figmaLight: "variables de color de Figma, modo claro",
    figmaDark: "variables de color de Figma, modo oscuro",
    figmaNumbers: "variables numéricas de Figma (radios, espacios y componentes)",
    designMd: "brief legible para agentes (spec DESIGN.md)",
  },
  appendixCss: "CSS del tema",
  appendixRule: "Contenido de `.cursor/rules/dialmade-design.mdc`",
  ruleDescription: (name) => `Sistema de diseño de ${name} (Dialmade). Aplícalo a cualquier trabajo de UI.`,
  ruleSource: `La fuente de verdad son \`${EXPORT_FILES.designMd}\` y \`${EXPORT_FILES.themeCss}\`: léelos antes de tocar la UI.`,
};

const EN: Copy = {
  targets: {
    claude: {
      title: (c) => `${c.name}: design direction for Claude`,
      before: () => [
        `Paste it into Claude (claude.ai or Claude Code) and attach \`${EXPORT_FILES.themeCss}\` and \`${EXPORT_FILES.designMd}\` from the export pack.`,
      ],
      task: (c) =>
        `Build the ${c.focus} for ${c.name} with React and Tailwind CSS v4 (plus shadcn/ui if the project uses it), following this design direction exactly.`,
      steps: (c) => [
        `Add \`${EXPORT_FILES.themeCss}\` to the global stylesheet after \`@import "tailwindcss";\` and map the tokens with \`@theme inline\` (\`--color-primary: var(--primary)\`, \`--radius-md: var(--dl-radius-md)\`, \`--font-heading: var(--dl-font-heading)\`).`,
        `Load the fonts: \`<link rel="stylesheet" href="${c.fontsUrl}">\` (or next/font with the same families and weights).`,
        'Build the sections under "Pages" in that order, one component each, with the given text.',
        "Style only with the variables: `var(--primary)`, `var(--dl-button-radius)`, `var(--dl-space-4)`, `var(--dl-card-shadow)`, `var(--dl-duration-base)` and `var(--dl-ease)`.",
        "Make light and dark modes work (`.dark` class) and check AA contrast and `prefers-reduced-motion`.",
      ],
    },
    "claude-design": {
      title: (c) => `${c.name}: design system for Claude Design`,
      before: () => [
        `In Claude, create a Design System artifact (Claude Design) and upload from the export pack: \`${EXPORT_FILES.designMd}\`, \`${EXPORT_FILES.themeCss}\`, \`${EXPORT_FILES.dtcg}\`, the logo files and \`preview.html\` if you have it. Then paste this text.`,
      ],
      task: (c) => `Create the ${c.name} design system from the uploaded files and use it to build the ${c.focus}.`,
      steps: (c) => [
        `Read the colors from the custom properties in \`${EXPORT_FILES.themeCss}\` (\`:root\` = light, \`.dark\` = dark). Use \`${EXPORT_FILES.dtcg}\` (DTCG) only as a cross-check.`,
        "Respect the exact hex values and roles. Don't create new colors or adjust contrast.",
        `Typography: ${c.heading} for headings and ${c.body} for text (${c.fontsUrl}), with the scale below.`,
        "Components: Button (primary, secondary and cta; sm, md and lg), Card, Input, Badge, Nav, table row and Sidebar, with the component tokens below.",
        `Build the ${c.focus} preview with the sections under "Pages".`,
        `Document the do's and don'ts from \`${EXPORT_FILES.designMd}\`.`,
      ],
    },
    framer: {
      title: (c) => `${c.name}: prompt for Framer (external agents)`,
      before: () => [
        "You need a Framer project on a plan with External Agents (free preview on Basic and Pro) and Node 22 or later.",
        "In a terminal run `npx @framer/agent@latest setup` and approve the connection in the browser.",
        "Open Claude Code, run `/framer` and paste this text.",
      ],
      task: (c) => `Using the Framer agent tools, build the ${c.focus} for ${c.name} in the open Framer project.`,
      steps: (c) => [
        "Create one color style per role in the table, with its light and dark values.",
        "Create the text styles Display, H1, H2, H3, Body, Small and Caption with the families, sizes, weights, line heights and tracking below (they are Google Fonts available in Framer).",
        'Build each section under "Pages" in order as a responsive stack (desktop container, tablet and phone) with the radii, spacing and shadows below.',
        `For interactions use Framer's effects or code components with \`framer-motion\` (bundled by Framer): ${c.fast}/${c.base}/${c.slow} ms and \`${c.ease}\`. No GSAP.`,
        "Show me the result before publishing. Don't publish without my approval.",
      ],
    },
    figma: {
      title: (c) => `${c.name}: bring it to Figma with Claude Code`,
      before: () => [
        "You need Claude Code with the Figma MCP server connected and edit access to the file. `generate_figma_design` only works from Claude Code or an IDE (not Claude Desktop) and `use_figma` is in beta. Writing outside drafts needs a Full seat.",
        `Without Claude: drag \`${EXPORT_FILES.figmaLight}\` and \`${EXPORT_FILES.figmaDark}\` into the Variables panel (one collection with two modes; on Starter, two collections).`,
      ],
      task: (c) => `Recreate the ${c.name} design direction in Figma: variables first, then the ${c.focus} as editable layers.`,
      steps: (c) => [
        `Variables: with \`use_figma\`, create the collection "${c.name}" with Light and Dark modes. Add one color variable per role (\`color/primary\`…) from \`${EXPORT_FILES.figmaLight}\` and \`${EXPORT_FILES.figmaDark}\`, and the number variables from \`${EXPORT_FILES.figmaNumbers}\` (\`radius/*\`, \`space/*\`, \`component/button/radius\`…) with the scopes in \`com.figma.scopes\`.`,
        "Give each variable its web code syntax with the CSS name (`var(--primary)`, `var(--dl-radius-md)`).",
        `Layers: serve the exported HTML pack locally (\`npx serve .\` in the pack folder) and run \`generate_figma_design\` on \`http://localhost:3000\` to capture the ${c.focus} as layers on a new page.`,
        "Bind the captured layers to the variables where they match: fills to `color/*`, corner radius to `radius/*` and gaps to `space/*`.",
        'Add a "Style Guide" page with text styles from the type scale and effect styles for the shadows below. Shadows and motion curves cannot be variables.',
      ],
    },
    v0: {
      title: (c) => `${c.name}: prompt for v0`,
      before: () => ["Paste it into v0. v0 doesn't apply cssVars from a registry, so the theme travels inside this prompt."],
      task: (c) => `Build the ${c.focus} for ${c.name} in Next.js with shadcn/ui and Tailwind CSS v4.`,
      steps: (c) => [
        "Replace the `:root` and `.dark` blocks of `app/globals.css` with the CSS at the end and map the tokens in `@theme inline` (`--color-primary: var(--primary)`…).",
        `Load the fonts with \`next/font/google\`: ${c.heading} and ${c.body}.`,
        "Use shadcn/ui components and set radii, heights and paddings with the `--dl-*` variables (e.g. `rounded-[var(--dl-button-radius)] h-[var(--dl-button-h-md)]`).",
        'Build the sections under "Pages" in order, with the given text.',
        "Light and dark modes must both work. Respect `prefers-reduced-motion`.",
      ],
    },
    cursor: {
      title: (c) => `${c.name}: prompt for Cursor`,
      before: () => [
        `Save \`${EXPORT_FILES.designMd}\` at the repo root and \`${EXPORT_FILES.themeCss}\` next to your global stylesheet. Then paste this text into Cursor's Agent.`,
      ],
      task: (c) => `Implement the ${c.focus} for ${c.name} following \`${EXPORT_FILES.designMd}\` and the rule \`.cursor/rules/dialmade-design.mdc\`.`,
      steps: (c) => [
        "Create `.cursor/rules/dialmade-design.mdc` with the content at the end.",
        `Import \`${EXPORT_FILES.themeCss}\` in the global stylesheet and map the tokens with Tailwind v4 \`@theme inline\`.`,
        `Load the fonts (${c.fontsUrl}).`,
        'Build the sections under "Pages" in order, one component each.',
        "Never write literal colors, radii or shadows: always use the variables.",
      ],
    },
  },
  beforeTitle: "Before you start",
  stepsTitle: "Steps",
  briefTitle: "Design direction",
  brand: "Brand",
  name: "Name",
  tagline: "Tagline",
  product: "Product",
  focus: "Focus",
  style: "Style",
  palette: "Palette style",
  colors: "Colors",
  colorsNote: "Exact hex per role (names are the CSS variables). Every text and UI pair meets AA.",
  role: "Role",
  light: "Light",
  dark: "Dark",
  type: "Typography",
  headingFont: "Headings",
  bodyFont: "Text",
  scale: "Scale",
  fluidFrom: "fluid from",
  shape: "Shape, space and elevation",
  radius: "Radii",
  spacing: (density) => `Spacing (density ${density}/10)`,
  container: "Container",
  sectionPy: "Section padding",
  borderWidth: "Border",
  shadows: "Shadows (light mode)",
  flat: "none: flat style",
  components: "Components",
  motion: "Motion",
  reducedMotion: "Respect `prefers-reduced-motion`.",
  pages: "Pages",
  customLayout: "Custom layout",
  hidden: "hidden",
  routes:
    'One route per screen, linked as in the flow ("Screens and flow"): each block that "links to" another screen leads there, and the app navigation links its screens. Follow each screen\'s wireframe, reading order and tablet and phone rules.',
  routesFigma:
    'One route per screen in the HTML pack: capture each screen in "Screens and flow" as a frame, in flow order, and link them as a prototype following the links.',
  rulesTitle: "Rules",
  rules: [
    "Use the exact hex values and roles. Don't invent colors, fonts, radii or shadows.",
    "`--brand` is decorative: for brand-colored text use `--primary-text`.",
    "`--cta` only for the main action of each view. `--accent` is the hover surface, not the CTA.",
    "One display per view; hierarchy comes from the type scale.",
    "Animate with CSS or Motion (motion.dev), never GSAP, and never beyond the `slow` duration.",
  ],
  filesTitle: "Files in the pack",
  files: {
    themeCss: "every CSS variable (`:root` and `.dark`)",
    dtcg: "DTCG 2025.10 tokens (color, typography, dimensions, shadows, durations and components)",
    figmaLight: "Figma color variables, light mode",
    figmaDark: "Figma color variables, dark mode",
    figmaNumbers: "Figma number variables (radii, spacing and components)",
    designMd: "agent-readable brief (DESIGN.md spec)",
  },
  appendixCss: "Theme CSS",
  appendixRule: "Content of `.cursor/rules/dialmade-design.mdc`",
  ruleDescription: (name) => `${name} design system (Dialmade). Apply it to any UI work.`,
  ruleSource: `The source of truth is \`${EXPORT_FILES.designMd}\` and \`${EXPORT_FILES.themeCss}\`: read them before touching the UI.`,
};

const COPY: Record<Locale, Copy> = { es: ES, en: EN };

const shadowLine = (t: ResolvedTokens, copy: Copy) =>
  SHADOW_NAMES.every((name) => t.shadows[name].length === 0)
    ? copy.flat
    : SHADOW_NAMES.map((name) => `${name} \`${shadowCss(t.shadows[name])}\``).join(" · ");

/** The visible sections in order (hidden ones are left out: the steps say «build them in order»). */
function outlineLines(doc: DesignDoc, page: Page, locale: Locale, copy: Copy, visibleProps?: ExportOptions["visibleProps"]): string[] {
  let n = 0;
  return pageOutline(doc, page, visibleProps)
    .filter((item) => !item.hidden)
    .flatMap((item) => {
      const marker = item.depth === 0 ? `${++n}.` : "-";
      return outlineItemLines(item, `${marker} ${sectionLabel(item.type, locale)} (\`${item.type}\`)`, "   ".repeat(item.depth), copy.hidden);
    });
}

/** Pages to outline, as `[title, page, custom layout]`. Only legacy docs get a made-up focus page. */
function pagesForPack(doc: DesignDoc, locale: Locale): [string, Page, boolean][] {
  if (hasScreens(doc)) {
    return renderTargets(doc).map((target) => [target.screen ? plainText(target.screen.name) : kindLabel(target.kind, locale), target.page, !!target.screen]);
  }
  const kinds = pageKinds(doc);
  const out: [string, Page, boolean][] = kinds.map((kind) => [kindLabel(kind, locale), doc.pages[kind]!, false]);
  if (!doc.pages[doc.brief.focus]) {
    out.unshift([kindLabel(doc.brief.focus, locale), createPage(doc.brief.focus, { productType: doc.brief.productType }), false]);
  }
  return out;
}

function brief(doc: DesignDoc, t: ResolvedTokens, dark: ResolvedTokens, locale: Locale, copy: Copy, options: { fontsUrl: string; recipe: string; recipeDescription: string; paletteStyle: string; motionLabel: string; visibleProps?: ExportOptions["visibleProps"] }): string[] {
  const { button, card, input, badge, nav, table, sidebar } = t.components;
  const fs = (name: (typeof FONT_SIZE_NAMES)[number]) => {
    const size = t.fontSizes[name];
    return size.minPx < size.px ? `${name} ${size.px}px (${copy.fluidFrom} ${size.minPx}px)` : `${name} ${size.px}px`;
  };
  const lines = [
    `## ${copy.briefTitle}`,
    "",
    `### ${copy.brand}`,
    "",
    `- ${copy.name}: ${doc.brand.name}`,
    ...(doc.brand.tagline ? [`- ${copy.tagline}: ${doc.brand.tagline}`] : []),
    `- ${copy.product}: ${productLabel(doc, locale)}`,
    `- ${copy.focus}: ${kindLabel(doc.brief.focus, locale)}`,
    `- ${copy.style}: ${options.recipe}. ${options.recipeDescription}`,
    `- ${copy.palette}: ${options.paletteStyle}`,
    "",
    `### ${copy.colors}`,
    "",
    copy.colorsNote,
    "",
    mdTable([copy.role, copy.light, copy.dark], Object.keys(t.colors).map((name) => [`\`--${name}\``, t.colors[name]!, dark.colors[name]!])),
    "",
    `### ${copy.type}`,
    "",
    `- ${copy.headingFont}: ${t.fonts.heading.family ?? "system-ui"} ${t.heading.weight}, tracking ${t.heading.tracking}em, line-height ${t.lineHeights.tight}`,
    `- ${copy.bodyFont}: ${t.fonts.body.family ?? "system-ui"} ${t.bodyWeight}, line-height ${t.lineHeights.body}`,
    `- Google Fonts: ${options.fontsUrl}`,
    `- ${copy.scale}: ${FONT_SIZE_NAMES.map(fs).join(" · ")}`,
    "",
    `### ${copy.shape}`,
    "",
    `- ${copy.radius}: ${RADIUS_NAMES.map((name) => `${name} ${t.radius[name]}px`).join(" · ")}`,
    `- ${copy.spacing(t.dials.density)}: ${t.space.map((px) => `${px}`).join(", ")} px (\`--dl-space-1…10\`)`,
    `- ${copy.container}: ${t.layout.container}px · ${copy.sectionPy}: ${t.layout.sectionPy}px · ${copy.borderWidth}: ${t.borderWidth}px`,
    `- ${copy.shadows}: ${shadowLine(t, copy)}`,
    "",
    `### ${copy.components}`,
    "",
    `- Button: radius ${button.radius.px}px, h ${button.hSm}/${button.hMd}/${button.hLg}px, padding-x ${button.px.px}px, weight ${button.weight}, shadow ${button.shadow}`,
    `- Card: radius ${card.radius.px}px, padding ${card.padding.px}px, shadow ${card.shadow}, border ${card.border ? `${card.border.width}px solid --${card.border.color}` : "none"}`,
    `- Input: radius ${input.radius.px}px, h ${input.h.px}px · Badge: radius ${badge.radius.px}px`,
    `- Nav ${nav.h}px · Table row ${table.rowH}px · Sidebar ${sidebar.w}px`,
    "",
    `### ${copy.motion}`,
    "",
    `- ${options.motionLabel}: fast ${t.motion.fast}ms · base ${t.motion.base}ms · slow ${t.motion.slow}ms · ease \`${t.motion.ease}\``,
    `- ${copy.reducedMotion}`,
    "",
    ...screensLayoutLines(doc, locale),
    `### ${copy.pages}`,
    "",
  ];
  for (const [title, page, custom] of pagesForPack(doc, locale)) {
    lines.push(`**${title}** (${custom ? copy.customLayout : `\`${page.layoutId}\``})`, "", ...outlineLines(doc, page, locale, copy, options.visibleProps), "");
  }
  return lines;
}

/**
 * Copy-ready text for the user's AI or tool: setup notes, concrete steps for the target, the full
 * design direction (exact colors, type, shape, components, motion and page outline) and rules.
 * `v0` carries the whole theme CSS; `cursor` carries a `.cursor/rules` file. Deterministic.
 */
export function toPromptPack(
  doc: DesignDoc,
  target: PromptTarget,
  locale: Locale = doc.brief.locale,
  options: ExportOptions = {},
): string {
  const copy = COPY[locale];
  const spec = copy.targets[target];
  const { inputs, light, dark } = resolveExport(doc, options);
  const fontsUrl = fontsUrlFor(doc, inputs.pairing) ?? inputs.pairing.googleFontsUrl;
  const screens = hasScreens(doc);
  const ctx: Ctx = {
    name: doc.brand.name,
    focus: screens ? screenNames(doc, locale) : kindLabel(doc.brief.focus, locale),
    fontsUrl,
    heading: light.fonts.heading.family ?? "system-ui",
    body: light.fonts.body.family ?? "system-ui",
    fast: light.motion.fast,
    base: light.motion.base,
    slow: light.motion.slow,
    ease: light.motion.ease,
  };

  const steps = spec.steps(ctx);
  if (screens) steps.splice(Math.max(0, steps.length - 1), 0, target === "figma" ? copy.routesFigma : copy.routes);
  const out = [
    `# ${spec.title(ctx)}`,
    "",
    `## ${copy.beforeTitle}`,
    "",
    ...spec.before(ctx).map((line) => `- ${line}`),
    "",
    spec.task(ctx),
    "",
    `## ${copy.stepsTitle}`,
    "",
    ...steps.map((line, i) => `${i + 1}. ${line}`),
    "",
    ...brief(doc, light, dark, locale, copy, {
      fontsUrl,
      recipe: inputs.recipe.label[locale],
      recipeDescription: inputs.recipe.description[locale],
      paletteStyle: inputs.theme.styleId,
      motionLabel: inputs.motionTier.label[locale],
      ...(options.visibleProps && { visibleProps: options.visibleProps }),
    }),
    `## ${copy.rulesTitle}`,
    "",
    ...copy.rules.map((line) => `- ${line}`),
    "",
  ];

  if (target !== "v0") {
    out.push(
      `## ${copy.filesTitle}`,
      "",
      ...(Object.keys(EXPORT_FILES) as (keyof typeof EXPORT_FILES)[]).map((key) => `- \`${EXPORT_FILES[key]}\`: ${copy.files[key]}`),
      "",
    );
  }
  if (target === "v0") {
    out.push(`## ${copy.appendixCss}`, "", "```css", toThemeCss(doc, options).trimEnd(), "```", "");
  }
  if (target === "cursor") {
    out.push(
      `## ${copy.appendixRule}`,
      "",
      "```md",
      "---",
      `description: ${copy.ruleDescription(doc.brand.name)}`,
      'globs: "**/*.{tsx,jsx,css}"',
      "alwaysApply: true",
      "---",
      "",
      `- ${copy.ruleSource}`,
      ...copy.rules.map((line) => `- ${line}`),
      "```",
      "",
    );
  }
  return out.join("\n");
}
