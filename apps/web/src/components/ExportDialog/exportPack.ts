// Builds the files of the export (loaded on demand: it brings react-dom/server, fflate and the kit CSS
// through the caller). Pure: same input, same files, so it is tested in Node.
import type { Locale, OutputKind } from "@dialmade/catalog";
import {
  EXPORT_FILES,
  PROMPT_TARGETS,
  SCREEN_EXPORT_FILES,
  compileThemeVars,
  fontsUrlFor,
  resolveFonts,
  toDTCGFull,
  toDesignMd,
  toFigmaNumberVars,
  toPromptPack,
  toThemeCss,
  type DesignDoc,
  type ExportOptions,
  type Page,
  type PageElement,
  type ThemeInputs,
} from "@dialmade/doc";
import { exportThemeCss } from "@dialmade/ai-render";
import { renderStaticPage, visibleProps } from "@dialmade/sections";
import { strToU8, zipSync, type Zippable } from "fflate";
import type { ExportDictionary, PackReadmeInfo, PackReadmeScreen } from "@/i18n/export";
import { aiExportBlocks, aiPageParts, type AiExportBlock } from "./aiBlocks";
import { bytesToBase64, slugify } from "./files";
import { layoutJson, linkResolver, relativeHref, screenPages, screenPath, type PackScreen } from "./screenPages";
import { figmaTokensJson } from "./tokens";

export type KitCss = { ui: string; sections: string };
export type LogoFile = { bytes: Uint8Array; type: string };

export type PackInput = {
  doc: DesignDoc;
  /** `useDesignDerived().inputs`: theme, recipe, pairing and motion tier of the doc. */
  inputs: ThemeInputs;
  /** Mode the HTML pages render in (`theme.css` always carries both). */
  mode: "light" | "dark";
  /** Language of the README and the prompts (the app's). The pages keep the doc's copy. */
  locale: Locale;
  kindLabel: (kind: OutputKind) => string;
  texts: ExportDictionary["files"];
  css: KitCss;
  logo?: LogoFile;
  /**
   * «Diseño con IA»: the CSS of the document's AI blocks (`compileAiCss(aiClassTokens(…), { scoped: true })`, built
   * off the main thread by the caller) and the README lines about them. Without it, AI blocks export as their base
   * design.
   */
  ai?: { css: string; texts: ExportDictionary["aiExport"]["files"] };
};

/** Files of «Diseño con IA» in the packs. */
export const AI_FILES = { css: "assets/dialmade-ai.css", theme: "ai-theme.css" } as const;

export type BuiltFile = { bytes: Uint8Array; filename: string; type: string; skippedSections: number };

const KIND_ORDER: readonly OutputKind[] = ["brand", "landing", "app"];
const JSON_INDENT = 2;
const json = (value: unknown) => `${JSON.stringify(value, null, JSON_INDENT)}\n`;
/** Only these characters reach a ZIP path; every path is built from fixed names and slugs. */
const SAFE_PATH = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/i;

/** Pages of the doc with the focus first (the one `index.html` / `preview.html` shows). */
export function packKinds(doc: DesignDoc): OutputKind[] {
  const kinds = KIND_ORDER.filter((kind) => doc.pages[kind]);
  return [...kinds.filter((kind) => kind === doc.brief.focus), ...kinds.filter((kind) => kind !== doc.brief.focus)];
}

/**
 * The exports describe what the pages render: a screen page stores its lists at their maximum and `count`
 * decides how many show (`visibleProps` of @dialmade/sections). Documents without screens are not affected.
 */
export const describeElement = (element: PageElement): Record<string, unknown> => visibleProps(element);

/** Options of every DESIGN.md and prompt pack of the export. */
export const exportOptions = (inputs: ThemeInputs): ExportOptions => ({ ...inputs, visibleProps: describeElement });

/** User text inside the README's Markdown: one line, no backticks. */
const mdText = (text: unknown) => (typeof text === "string" ? text : "").replace(/`/g, "").replace(/\s+/g, " ").trim();

function readmeInfo(
  input: PackInput,
  focus: string,
  pages: PackReadmeInfo["pages"],
  screens: PackReadmeScreen[] = [],
): PackReadmeInfo {
  const { doc, inputs } = input;
  const fonts = resolveFonts(doc, inputs.pairing);
  const fontsUrl = fontsUrlFor(doc, inputs.pairing);
  return {
    version: doc.version,
    name: doc.brand.name,
    ...(doc.brand.tagline && { tagline: doc.brand.tagline }),
    focus,
    pages,
    screens,
    heading: fonts.heading.family ?? inputs.pairing.heading.family,
    body: fonts.body.family ?? inputs.pairing.body.family,
    ...(fontsUrl && { fontsUrl }),
    hasLogo: !!input.logo,
  };
}

/** «Pantallas y flujo» of the README: every screen with its file in this pack and the screens it links to. */
function readmeScreens(screens: readonly PackScreen[], pathOf: (screen: PackScreen) => string): PackReadmeScreen[] {
  return screens.map((screen) => {
    const targets = new Set(Object.values(screen.links));
    return {
      name: mdText(screen.name),
      route: mdText(screen.route),
      path: pathOf(screen),
      linksTo: screens.filter((other) => targets.has(other.id)).map((other) => mdText(other.name)),
    };
  });
}

/** Theme, tokens and briefs shared by both packs. */
function tokenFiles(input: PackInput): Record<string, string> {
  const { doc, inputs } = input;
  return {
    [EXPORT_FILES.themeCss]: toThemeCss(doc, inputs),
    [EXPORT_FILES.dtcg]: json(toDTCGFull(doc, inputs)),
    [EXPORT_FILES.designMd]: toDesignMd(doc, { ...exportOptions(inputs), locale: input.locale }),
  };
}

type RenderTarget = {
  kind: OutputKind;
  /** `<title>` after the brand name. */
  label: string;
  /** A screen's page; without it, `doc.pages[kind]`. */
  page?: Page;
  linkHref?: (id: string) => string | null;
  links?: Readonly<Record<string, string>>;
};

type RenderOptions = { logoUrl?: string; css?: string[]; stylesheets?: string[]; ai?: { aiBlocks: Record<string, string>; aiSurfaces: Record<string, string> } };

function renderPage(input: PackInput, target: RenderTarget, options: RenderOptions) {
  const { doc, inputs, mode } = input;
  const pageDials = (target.page ?? doc.pages[target.kind])?.dials;
  const vars = compileThemeVars(doc, { ...inputs, mode, ...(pageDials && { pageDials }) });
  let skipped = 0;
  const html = renderStaticPage(doc, target.kind, vars, {
    mode,
    title: `${doc.brand.name} · ${target.label}`,
    ...(target.page && { page: target.page }),
    ...(target.linkHref && { linkHref: target.linkHref }),
    ...(target.links && { links: target.links }),
    ...(options.logoUrl && { logoUrl: options.logoUrl }),
    ...(options.css && { css: options.css }),
    ...(options.stylesheets && { stylesheets: options.stylesheets }),
    ...(options.ai && Object.keys(options.ai.aiBlocks).length > 0 && { aiBlocks: options.ai.aiBlocks }),
    ...(options.ai && Object.keys(options.ai.aiSurfaces).length > 0 && { aiSurfaces: options.ai.aiSurfaces }),
    onSectionError: () => {
      skipped++;
    },
  });
  return { html, skipped };
}

/** The AI blocks a pack exports: none without the compiled AI CSS (they would render unstyled). */
const aiBlocksFor = (input: PackInput): AiExportBlock[] => (input.ai ? aiExportBlocks(input.doc) : []);

const kindTarget = (input: PackInput, kind: OutputKind): RenderTarget => ({ kind, label: input.kindLabel(kind) });

/** A screen rendered with its own dials and page title, its `linkTo`s and `linkHref` for every link. */
const screenTarget = (screen: PackScreen, linkHref: (id: string) => string | null): RenderTarget => ({
  kind: screen.kind,
  label: screen.name,
  page: screen.page,
  linkHref,
  links: screen.links,
});

const zip = (root: string, files: Record<string, string | Uint8Array>): Uint8Array => {
  const tree: Zippable = {};
  for (const [path, content] of Object.entries(files)) {
    // Defense in depth: paths come from fixed names and slugs, never from a route or a name as typed.
    if (!SAFE_PATH.test(path) || path.split("/").includes("..")) throw new Error(`Unsafe path in the export: ${JSON.stringify(path)}`);
    tree[`${root}/${path}`] = typeof content === "string" ? strToU8(content) : [content, { level: 0 }];
  }
  return zipSync(tree, { level: 6 });
};

/**
 * «Código»: one `index.html` per page linking the kit CSS, `theme.css`, DTCG tokens, Figma variables,
 * DESIGN.md, every prompt pack and a README. Without screens: `{kind}/index.html`, plus the focus page at the
 * root. With screens (Modo Layout): one folder per screen (`/` at the root) with its `index.html`,
 * `layout.css` and `layout.json`, real relative links between them, and the style guide in `brand/`.
 */
export function buildCodePack(input: PackInput): BuiltFile {
  const { doc, inputs } = input;
  const slug = slugify(doc.brand.name);
  const files: Record<string, string | Uint8Array> = {
    ...tokenFiles(input),
    [EXPORT_FILES.figmaLight]: figmaTokensJson(doc, inputs, "light"),
    [EXPORT_FILES.figmaDark]: figmaTokensJson(doc, inputs, "dark"),
    [EXPORT_FILES.figmaNumbers]: json(toFigmaNumberVars(doc, inputs)),
    "assets/dialmade-ui.css": input.css.ui,
    "assets/dialmade-sections.css": input.css.sections,
  };
  if (input.logo) files["assets/logo.png"] = input.logo.bytes;
  const options = exportOptions(inputs);
  for (const target of PROMPT_TARGETS) files[`prompts/${target}.md`] = toPromptPack(doc, target, input.locale, options);

  const aiBlocks = aiBlocksFor(input);
  if (aiBlocks.length > 0) {
    files[AI_FILES.css] = input.ai!.css;
    files[AI_FILES.theme] = exportThemeCss();
  }

  let skippedSections = 0;
  const render = (target: RenderTarget, base: string, extraCss: string[] = [], count = true, ai?: RenderOptions["ai"]) => {
    const result = renderPage(input, target, {
      ...(input.logo && { logoUrl: `${base}assets/logo.png` }),
      stylesheets: [`${base}assets/dialmade-ui.css`, `${base}assets/dialmade-sections.css`, ...extraCss],
      ...(ai && { ai }),
    });
    if (count) skippedSections += result.skipped;
    return result.html;
  };

  const screens = screenPages(doc);
  let readme: PackReadmeInfo;
  if (screens.length > 0) {
    for (const screen of screens) {
      const folder = screen.dir ? `${screen.dir}/` : "";
      const base = screen.dir ? "../" : "";
      const linkHref = linkResolver(screens, (to) => relativeHref(screen, to));
      const ai = aiPageParts(aiBlocks, screen.id, { hrefOf: linkHref, ...(input.logo && { logoUrl: `${base}assets/logo.png` }) });
      const aiCss = Object.keys(ai.aiBlocks).length + Object.keys(ai.aiSurfaces).length > 0 ? [`${base}${AI_FILES.css}`] : [];
      // layout.css sits next to the page and loads after the kit CSS (the names DESIGN.md and the prompts use).
      files[`${folder}index.html`] = render(screenTarget(screen, linkHref), base, [SCREEN_EXPORT_FILES.layoutCss, ...aiCss], true, ai);
      files[`${folder}${SCREEN_EXPORT_FILES.layoutCss}`] = screen.css;
      files[`${folder}${SCREEN_EXPORT_FILES.layoutJson}`] = json(layoutJson(screen, linkHref));
    }
    if (doc.pages.brand) files["brand/index.html"] = render(kindTarget(input, "brand"), "../");
    const root = screens.find((screen) => screen.dir === "") ?? screens[0]!;
    const pages = [
      ...screens.filter((screen) => screen !== root).map((screen) => ({ path: screenPath(screen), label: mdText(screen.name) })),
      ...(doc.pages.brand ? [{ path: "brand/index.html", label: input.kindLabel("brand") }] : []),
    ];
    readme = readmeInfo(input, mdText(root.name), pages, readmeScreens(screens, screenPath));
  } else {
    const kinds = packKinds(doc);
    kinds.forEach((kind, index) => {
      files[`${kind}/index.html`] = render(kindTarget(input, kind), "../");
      // The focus page again at the root (its skipped sections are already counted).
      if (index === 0) files["index.html"] = render(kindTarget(input, kind), "", [], false);
    });
    readme = readmeInfo(
      input,
      input.kindLabel(kinds[0] ?? doc.brief.focus),
      kinds.map((kind) => ({ path: `${kind}/index.html`, label: input.kindLabel(kind) })),
    );
  }

  const aiReadme = aiBlocks.length > 0 ? input.ai!.texts.codeReadme(aiBlocks.filter((block) => block.html).length) : "";
  return {
    bytes: zip(`${slug}-dialmade`, { "README.md": `${input.texts.codeReadme(readme)}${aiReadme}`, ...files }),
    filename: `${slug}-dialmade.zip`,
    type: "application/zip",
    skippedSections,
  };
}

/**
 * «Claude Design»: a folder to upload to a Design System artifact. Brand book README, DESIGN.md, theme
 * and tokens, and self-contained previews (kit CSS inline, logo as data URL) of every page. With screens:
 * `preview.html` is the first screen, `preview-{screen}.html` the others (linked to each other, each with its
 * layout CSS inline) and `preview-brand.html` the style guide.
 */
export function buildClaudeDesignPack(input: PackInput): BuiltFile {
  const { doc } = input;
  const slug = slugify(doc.brand.name);
  const logoUrl = input.logo ? `data:${input.logo.type};base64,${bytesToBase64(input.logo.bytes)}` : undefined;
  const files: Record<string, string | Uint8Array> = {
    ...tokenFiles(input),
    "prompt.md": toPromptPack(doc, "claude-design", input.locale, exportOptions(input.inputs)),
  };
  if (input.logo) files["logo.png"] = input.logo.bytes;

  const aiBlocks = aiBlocksFor(input);
  if (aiBlocks.length > 0) files[AI_FILES.theme] = exportThemeCss();

  let skippedSections = 0;
  const render = (target: RenderTarget, extraCss: string[] = [], ai?: RenderOptions["ai"]) => {
    const result = renderPage(input, target, { ...(logoUrl && { logoUrl }), css: [input.css.ui, input.css.sections, ...extraCss], ...(ai && { ai }) });
    skippedSections += result.skipped;
    return result.html;
  };

  const screens = screenPages(doc);
  let readme: PackReadmeInfo;
  if (screens.length > 0) {
    const first = screens[0]!;
    const previewOf = (screen: PackScreen) => (screen === first ? "preview.html" : `preview-${screen.slug}.html`);
    const linkHref = linkResolver(screens, previewOf);
    for (const screen of screens) {
      const ai = aiPageParts(aiBlocks, screen.id, { hrefOf: linkHref, ...(logoUrl && { logoUrl }) });
      const aiCss = Object.keys(ai.aiBlocks).length + Object.keys(ai.aiSurfaces).length > 0 ? [input.ai!.css] : [];
      files[previewOf(screen)] = render(screenTarget(screen, linkHref), [screen.css, ...aiCss], ai);
    }
    if (doc.pages.brand) files["preview-brand.html"] = render(kindTarget(input, "brand"));
    const pages = [
      ...screens.map((screen) => ({ path: previewOf(screen), label: mdText(screen.name) })),
      ...(doc.pages.brand ? [{ path: "preview-brand.html", label: input.kindLabel("brand") }] : []),
    ];
    readme = readmeInfo(input, mdText(first.name), pages, readmeScreens(screens, previewOf));
  } else {
    const kinds = packKinds(doc);
    kinds.forEach((kind, index) => {
      files[index === 0 ? "preview.html" : `preview-${kind}.html`] = render(kindTarget(input, kind));
    });
    readme = readmeInfo(
      input,
      input.kindLabel(kinds[0] ?? doc.brief.focus),
      kinds.map((kind, index) => ({ path: index === 0 ? "preview.html" : `preview-${kind}.html`, label: input.kindLabel(kind) })),
    );
  }

  const aiReadme = aiBlocks.length > 0 ? input.ai!.texts.claudeDesignReadme(aiBlocks.filter((block) => block.html).length) : "";
  return {
    bytes: zip(`${slug}-claude-design`, { "README.md": `${input.texts.claudeDesignReadme(readme)}${aiReadme}`, ...files }),
    filename: `${slug}-claude-design.zip`,
    type: "application/zip",
    skippedSections,
  };
}
