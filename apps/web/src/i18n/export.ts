import { defineDictionary } from "./config";

/** A screen of a Modo Layout document in the README of a pack. */
export type PackReadmeScreen = {
  name: string;
  route: string;
  /** Its file in this pack: `index.html`, `precios/index.html`, `preview-precios.html`… */
  path: string;
  /** Names of the screens its page links to, in flow order. */
  linksTo: string[];
};

/** What the README of the packs needs (built in ExportDialog/exportPack). */
export type PackReadmeInfo = {
  /** `DesignDoc` version of the exported document. */
  version: number;
  name: string;
  tagline?: string;
  focus: string;
  /** Pages listed under the focus, each with its file in this pack. */
  pages: { path: string; label: string }[];
  /** Modo Layout: the screens in order («Pantallas y flujo»); empty for documents without screens. */
  screens: PackReadmeScreen[];
  heading: string;
  body: string;
  /** Google Fonts stylesheet; absent when the families load from elsewhere (system or local). */
  fontsUrl?: string;
  hasLogo: boolean;
};

const list = (items: readonly string[]) => items.map((item) => `- ${item}`).join("\n");

type LayoutFileTexts = { css: string; json: string; flowTitle: string; flowNote: string };

/** «## Pantallas y flujo» of a README: one numbered line per screen with its route, its file and its links. */
const flowSection = (screens: readonly PackReadmeScreen[], texts: LayoutFileTexts): string[] =>
  screens.length === 0
    ? []
    : [
        `## ${texts.flowTitle}`,
        "",
        ...screens.map(
          (screen, i) =>
            `${i + 1}. ${screen.name} (\`${screen.route}\`): \`${screen.path}\`${screen.linksTo.length > 0 ? ` → ${screen.linksTo.join(", ")}` : ""}`,
        ),
        "",
        texts.flowNote,
        "",
      ];

const LAYOUT_ES: LayoutFileTexts = {
  css: "`layout.css` (junto al `index.html` de cada pantalla): la rejilla de la pantalla. Va después del CSS del kit.",
  json: "`layout.json` (junto al `index.html` de cada pantalla): el layout de la pantalla, con bloques, orden de lectura, reglas de tablet y móvil y enlaces.",
  flowTitle: "Pantallas y flujo",
  flowNote: "Los enlaces entre pantallas ya funcionan en el HTML. El flujo completo, con wireframes, está en `DESIGN.md`.",
};

const LAYOUT_EN: LayoutFileTexts = {
  css: "`layout.css` (next to each screen's `index.html`): the screen's grid. It goes after the kit CSS.",
  json: "`layout.json` (next to each screen's `index.html`): the screen's layout, with blocks, reading order, tablet and phone rules and links.",
  flowTitle: "Screens and flow",
  flowNote: "Links between screens already work in the HTML. The full flow, with wireframes, is in `DESIGN.md`.",
};

/** Texts of the Export dialog (DESIGN-BRIEF §6.4, ref. 4B Mistral AI) and of the files it writes. */
export const exportDialog = defineDictionary({
  es: {
    title: "Exportar",
    description: "Lleva tu dirección de diseño a tu código, a Figma, a Claude Design, a Framer o a tu IA.",
    close: "Cerrar",
    preview: {
      label: (name: string, kind: string) => `Vista previa de ${name}: ${kind}`,
      includes: "Incluye",
    },
    share: {
      toggle: "Link accesible para cualquiera",
      soon: "Pronto: requiere cuenta",
      urlLabel: "Link público",
      urlHint: "El link público llegará con las cuentas. Mientras tanto, exporta los archivos.",
      copyLink: "Copiar link",
    },
    destinations: {
      title: "Llévalo a",
      recommended: "Recomendado",
      code: {
        name: "Código",
        description: "ZIP con el HTML de cada página, el CSS del kit, theme.css, tokens DTCG, DESIGN.md y los prompts.",
        download: "Descargar ZIP",
      },
      figma: {
        name: "Figma",
        description: "Arrastra los .tokens.json al panel Variables (un modo por archivo) o recréalo con Claude Code y su prompt.",
        light: "Variables claro",
        dark: "Variables oscuro",
        prompt: "Copiar prompt",
      },
      claudeDesign: {
        name: "Claude Design",
        description: "Carpeta con brand book, tokens y preview para subir a un Design System en Claude, y su prompt.",
        download: "Descargar carpeta",
        prompt: "Copiar prompt",
      },
      framer: {
        name: "Framer",
        description: "Prompt para External Agents: ejecuta npx @framer/agent@latest setup y luego /framer en Claude Code.",
        prompt: "Copiar prompt",
      },
      ai: {
        name: "Tu IA",
        description: "Tu dirección de diseño completa, lista para pegar en Claude, Cursor o v0.",
        targetLabel: "Destino del prompt",
        prompt: "Copiar prompt",
      },
    },
    toasts: {
      copied: (target: string) => `Prompt para ${target} copiado`,
      copyFailed: "No pudimos copiar al portapapeles. Revisa los permisos del navegador.",
      downloaded: (file: string) => `${file} descargado`,
      failed: "No pudimos preparar la descarga. Inténtalo de nuevo.",
      skippedSections: (count: number) =>
        count === 1 ? "Una sección no se pudo exportar a HTML y se omitió." : `${count} secciones no se pudieron exportar a HTML y se omitieron.`,
    },
    files: {
      layout: LAYOUT_ES,
      codeReadme: (info: PackReadmeInfo) =>
        [
          `# ${info.name} · Dialmade`,
          "",
          ...(info.tagline ? [info.tagline, ""] : []),
          `Dirección de diseño exportada desde Dialmade (DesignDoc v${info.version}).`,
          "",
          "## Qué hay aquí",
          "",
          list([
            `\`index.html\`: ${info.focus}. Ábrelo en el navegador o sirve la carpeta con \`npx serve .\`.`,
            ...info.pages.map((page) => `\`${page.path}\`: ${page.label}.`),
            ...(info.screens.length > 0 ? [LAYOUT_ES.css, LAYOUT_ES.json] : []),
            "`assets/dialmade-ui.css` y `assets/dialmade-sections.css`: el CSS del kit (componentes y secciones). Solo usa clases `dl-` y variables CSS.",
            ...(info.hasLogo ? ["`assets/logo.png`: tu logo recortado."] : []),
            "`theme.css`: todas las variables del tema, en `:root` (claro) y `.dark` (oscuro).",
            "`tokens.tokens.json`: tokens DTCG 2025.10 (color, tipografía, dimensiones, sombras, duraciones y componentes).",
            "`figma-light.tokens.json`, `figma-dark.tokens.json` y `figma-numbers.tokens.json`: variables para el panel Variables de Figma.",
            "`DESIGN.md`: brief legible para agentes (spec DESIGN.md).",
            "`prompts/`: prompts listos para Claude, Claude Design, Cursor, v0, Figma y Framer.",
          ]),
          "",
          ...flowSection(info.screens, LAYOUT_ES),
          "## Usarlo en tu app",
          "",
          "1. Copia `theme.css` a tu proyecto e impórtalo después de `@import \"tailwindcss\";`.",
          "2. Mapea los tokens con `@theme inline` (`--color-primary: var(--primary)`, `--radius-md: var(--dl-radius-md)`…).",
          "3. Pide a tu IA que construya las páginas con `prompts/claude.md` o `prompts/cursor.md`.",
          "",
          `Tipografía: ${info.heading} para títulos y ${info.body} para texto${info.fontsUrl ? ` (${info.fontsUrl})` : ""}.`,
          "",
        ].join("\n"),
      claudeDesignReadme: (info: PackReadmeInfo) =>
        [
          `# ${info.name}: brand book`,
          "",
          ...(info.tagline ? [info.tagline, ""] : []),
          `Carpeta para crear el design system de ${info.name} en Claude Design.`,
          "",
          "## Cómo usarla",
          "",
          "1. En Claude, crea un artifact de tipo Design System (Claude Design).",
          `2. Sube estos archivos: \`DESIGN.md\`, \`theme.css\`, \`tokens.tokens.json\`, \`preview.html\`${info.hasLogo ? " y `logo.png`" : ""}.`,
          "3. Pega el prompt que copiaste en Dialmade (también está en `prompt.md`).",
          "",
          "## Reglas",
          "",
          list([
            "Respeta los hex y los roles exactos de `theme.css` (`:root` = claro, `.dark` = oscuro). No crees colores nuevos.",
            `Tipografía: ${info.heading} para títulos y ${info.body} para texto${info.fontsUrl ? ` (${info.fontsUrl})` : ""}.`,
            "Las formas, espacios, sombras y tiempos de animación están en `DESIGN.md` y `tokens.tokens.json`.",
          ]),
          "",
          "## Archivos",
          "",
          list([
            "`DESIGN.md`: el sistema completo, legible para agentes.",
            "`theme.css`: variables CSS de los dos modos.",
            "`tokens.tokens.json`: tokens DTCG 2025.10.",
            `\`preview.html\`: ${info.focus} con el tema aplicado (se abre sin conexión salvo las fuentes).`,
            ...info.pages.slice(1).map((page) => `\`${page.path}\`: ${page.label}.`),
            ...(info.hasLogo ? ["`logo.png`: el logo."] : []),
            "`prompt.md`: el prompt para Claude Design.",
          ]),
          "",
          ...flowSection(info.screens, LAYOUT_ES),
        ].join("\n"),
    },
  },
  en: {
    title: "Export",
    description: "Take your design direction to your code, Figma, Claude Design, Framer or your AI.",
    close: "Close",
    preview: {
      label: (name: string, kind: string) => `Preview of ${name}: ${kind}`,
      includes: "Includes",
    },
    share: {
      toggle: "Link accessible to anyone",
      soon: "Soon: requires an account",
      urlLabel: "Public link",
      urlHint: "Public links arrive with accounts. Meanwhile, export the files.",
      copyLink: "Copy link",
    },
    destinations: {
      title: "Take it to",
      recommended: "Recommended",
      code: {
        name: "Code",
        description: "ZIP with each page's HTML, the kit CSS, theme.css, DTCG tokens, DESIGN.md and the prompts.",
        download: "Download ZIP",
      },
      figma: {
        name: "Figma",
        description: "Drag the .tokens.json files into the Variables panel (one mode per file) or rebuild it with Claude Code and its prompt.",
        light: "Light variables",
        dark: "Dark variables",
        prompt: "Copy prompt",
      },
      claudeDesign: {
        name: "Claude Design",
        description: "Folder with a brand book, tokens and a preview to upload to a Design System in Claude, plus its prompt.",
        download: "Download folder",
        prompt: "Copy prompt",
      },
      framer: {
        name: "Framer",
        description: "Prompt for External Agents: run npx @framer/agent@latest setup, then /framer in Claude Code.",
        prompt: "Copy prompt",
      },
      ai: {
        name: "Your AI",
        description: "Your full design direction, ready to paste into Claude, Cursor or v0.",
        targetLabel: "Prompt target",
        prompt: "Copy prompt",
      },
    },
    toasts: {
      copied: (target: string) => `Prompt for ${target} copied`,
      copyFailed: "We couldn't copy to the clipboard. Check the browser's permissions.",
      downloaded: (file: string) => `${file} downloaded`,
      failed: "We couldn't prepare the download. Try again.",
      skippedSections: (count: number) =>
        count === 1 ? "One section couldn't be exported to HTML and was left out." : `${count} sections couldn't be exported to HTML and were left out.`,
    },
    files: {
      layout: LAYOUT_EN,
      codeReadme: (info: PackReadmeInfo) =>
        [
          `# ${info.name} · Dialmade`,
          "",
          ...(info.tagline ? [info.tagline, ""] : []),
          `Design direction exported from Dialmade (DesignDoc v${info.version}).`,
          "",
          "## What's here",
          "",
          list([
            `\`index.html\`: ${info.focus}. Open it in the browser or serve the folder with \`npx serve .\`.`,
            ...info.pages.map((page) => `\`${page.path}\`: ${page.label}.`),
            ...(info.screens.length > 0 ? [LAYOUT_EN.css, LAYOUT_EN.json] : []),
            "`assets/dialmade-ui.css` and `assets/dialmade-sections.css`: the kit CSS (components and sections). It only uses `dl-` classes and CSS variables.",
            ...(info.hasLogo ? ["`assets/logo.png`: your cropped logo."] : []),
            "`theme.css`: every theme variable, in `:root` (light) and `.dark` (dark).",
            "`tokens.tokens.json`: DTCG 2025.10 tokens (color, typography, dimensions, shadows, durations and components).",
            "`figma-light.tokens.json`, `figma-dark.tokens.json` and `figma-numbers.tokens.json`: variables for Figma's Variables panel.",
            "`DESIGN.md`: agent-readable brief (DESIGN.md spec).",
            "`prompts/`: ready prompts for Claude, Claude Design, Cursor, v0, Figma and Framer.",
          ]),
          "",
          ...flowSection(info.screens, LAYOUT_EN),
          "## Use it in your app",
          "",
          "1. Copy `theme.css` into your project and import it after `@import \"tailwindcss\";`.",
          "2. Map the tokens with `@theme inline` (`--color-primary: var(--primary)`, `--radius-md: var(--dl-radius-md)`…).",
          "3. Ask your AI to build the pages with `prompts/claude.md` or `prompts/cursor.md`.",
          "",
          `Typography: ${info.heading} for headings and ${info.body} for text${info.fontsUrl ? ` (${info.fontsUrl})` : ""}.`,
          "",
        ].join("\n"),
      claudeDesignReadme: (info: PackReadmeInfo) =>
        [
          `# ${info.name}: brand book`,
          "",
          ...(info.tagline ? [info.tagline, ""] : []),
          `Folder to create the ${info.name} design system in Claude Design.`,
          "",
          "## How to use it",
          "",
          "1. In Claude, create a Design System artifact (Claude Design).",
          `2. Upload these files: \`DESIGN.md\`, \`theme.css\`, \`tokens.tokens.json\`, \`preview.html\`${info.hasLogo ? " and `logo.png`" : ""}.`,
          "3. Paste the prompt you copied in Dialmade (it's also in `prompt.md`).",
          "",
          "## Rules",
          "",
          list([
            "Respect the exact hex values and roles in `theme.css` (`:root` = light, `.dark` = dark). Don't create new colors.",
            `Typography: ${info.heading} for headings and ${info.body} for text${info.fontsUrl ? ` (${info.fontsUrl})` : ""}.`,
            "Shapes, spacing, shadows and motion timings are in `DESIGN.md` and `tokens.tokens.json`.",
          ]),
          "",
          "## Files",
          "",
          list([
            "`DESIGN.md`: the whole system, agent-readable.",
            "`theme.css`: CSS variables for both modes.",
            "`tokens.tokens.json`: DTCG 2025.10 tokens.",
            `\`preview.html\`: ${info.focus} with the theme applied (works offline except for the fonts).`,
            ...info.pages.slice(1).map((page) => `\`${page.path}\`: ${page.label}.`),
            ...(info.hasLogo ? ["`logo.png`: the logo."] : []),
            "`prompt.md`: the prompt for Claude Design.",
          ]),
          "",
          ...flowSection(info.screens, LAYOUT_EN),
        ].join("\n"),
    },
  },
});

export type ExportDictionary = (typeof exportDialog)["es"];
