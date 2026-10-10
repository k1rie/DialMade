// Builds the files of the export (loaded on demand: it brings react-dom/server, fflate and the kit CSS
// through the caller). Pure: same input, same files, so it is tested in Node.
import type { Locale, OutputKind } from "@dialmade/catalog";
import {
  EXPORT_FILES,
  PROMPT_TARGETS,
  compileThemeVars,
  fontsUrlFor,
  resolveFonts,
  toDTCGFull,
  toDesignMd,
  toFigmaNumberVars,
  toPromptPack,
  toThemeCss,
  type DesignDoc,
  type ThemeInputs,
} from "@dialmade/doc";
import { renderStaticPage } from "@dialmade/sections";
import { strToU8, zipSync, type Zippable } from "fflate";
import type { ExportDictionary, PackReadmeInfo } from "@/i18n/export";
import { bytesToBase64, slugify } from "./files";
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
};

export type BuiltFile = { bytes: Uint8Array; filename: string; type: string; skippedSections: number };

const KIND_ORDER: readonly OutputKind[] = ["brand", "landing", "app"];
const JSON_INDENT = 2;
const json = (value: unknown) => `${JSON.stringify(value, null, JSON_INDENT)}\n`;

/** Pages of the doc with the focus first (the one `index.html` / `preview.html` shows). */
export function packKinds(doc: DesignDoc): OutputKind[] {
  const kinds = KIND_ORDER.filter((kind) => doc.pages[kind]);
  return [...kinds.filter((kind) => kind === doc.brief.focus), ...kinds.filter((kind) => kind !== doc.brief.focus)];
}

function readmeInfo(input: PackInput, kinds: readonly OutputKind[]): PackReadmeInfo {
  const { doc, inputs } = input;
  const fonts = resolveFonts(doc, inputs.pairing);
  const fontsUrl = fontsUrlFor(doc, inputs.pairing);
  return {
    name: doc.brand.name,
    ...(doc.brand.tagline && { tagline: doc.brand.tagline }),
    focus: input.kindLabel(kinds[0] ?? doc.brief.focus),
    pages: kinds.map((kind) => ({ kind, label: input.kindLabel(kind) })),
    heading: fonts.heading.family ?? inputs.pairing.heading.family,
    body: fonts.body.family ?? inputs.pairing.body.family,
    ...(fontsUrl && { fontsUrl }),
    hasLogo: !!input.logo,
  };
}

/** Theme, tokens and briefs shared by both packs. */
function tokenFiles(input: PackInput): Record<string, string> {
  const { doc, inputs } = input;
  return {
    [EXPORT_FILES.themeCss]: toThemeCss(doc, inputs),
    [EXPORT_FILES.dtcg]: json(toDTCGFull(doc, inputs)),
    [EXPORT_FILES.designMd]: toDesignMd(doc, { ...inputs, locale: input.locale }),
  };
}

function renderPage(input: PackInput, kind: OutputKind, options: { logoUrl?: string; css?: string[]; stylesheets?: string[] }) {
  const { doc, inputs, mode } = input;
  const pageDials = doc.pages[kind]?.dials;
  const vars = compileThemeVars(doc, { ...inputs, mode, ...(pageDials && { pageDials }) });
  let skipped = 0;
  const html = renderStaticPage(doc, kind, vars, {
    mode,
    title: `${doc.brand.name} · ${input.kindLabel(kind)}`,
    ...(options.logoUrl && { logoUrl: options.logoUrl }),
    ...(options.css && { css: options.css }),
    ...(options.stylesheets && { stylesheets: options.stylesheets }),
    onSectionError: () => {
      skipped++;
    },
  });
  return { html, skipped };
}

const zip = (root: string, files: Record<string, string | Uint8Array>): Uint8Array => {
  const tree: Zippable = {};
  for (const [path, content] of Object.entries(files)) {
    tree[`${root}/${path}`] = typeof content === "string" ? strToU8(content) : [content, { level: 0 }];
  }
  return zipSync(tree, { level: 6 });
};

/**
 * «Código»: one `index.html` per page (`{kind}/index.html`, plus the focus page at the root) linking
 * the kit CSS, `theme.css`, DTCG tokens, Figma variables, DESIGN.md, every prompt pack and a README.
 */
export function buildCodePack(input: PackInput): BuiltFile {
  const { doc, inputs } = input;
  const kinds = packKinds(doc);
  const slug = slugify(doc.brand.name);
  const files: Record<string, string | Uint8Array> = {
    "README.md": input.texts.codeReadme(readmeInfo(input, kinds)),
    ...tokenFiles(input),
    [EXPORT_FILES.figmaLight]: figmaTokensJson(doc, inputs, "light"),
    [EXPORT_FILES.figmaDark]: figmaTokensJson(doc, inputs, "dark"),
    [EXPORT_FILES.figmaNumbers]: json(toFigmaNumberVars(doc, inputs)),
    "assets/dialmade-ui.css": input.css.ui,
    "assets/dialmade-sections.css": input.css.sections,
  };
  if (input.logo) files["assets/logo.png"] = input.logo.bytes;
  for (const target of PROMPT_TARGETS) files[`prompts/${target}.md`] = toPromptPack(doc, target, input.locale, inputs);

  let skippedSections = 0;
  const page = (kind: OutputKind, base: string) =>
    renderPage(input, kind, {
      ...(input.logo && { logoUrl: `${base}assets/logo.png` }),
      stylesheets: [`${base}assets/dialmade-ui.css`, `${base}assets/dialmade-sections.css`],
    });
  kinds.forEach((kind, index) => {
    const result = page(kind, "../");
    skippedSections += result.skipped;
    files[`${kind}/index.html`] = result.html;
    if (index === 0) files["index.html"] = page(kind, "").html;
  });

  return { bytes: zip(`${slug}-dialmade`, files), filename: `${slug}-dialmade.zip`, type: "application/zip", skippedSections };
}

/**
 * «Claude Design»: a folder to upload to a Design System artifact. Brand book README, DESIGN.md, theme
 * and tokens, and self-contained previews (kit CSS inline, logo as data URL) of every page.
 */
export function buildClaudeDesignPack(input: PackInput): BuiltFile {
  const { doc } = input;
  const kinds = packKinds(doc);
  const slug = slugify(doc.brand.name);
  const logoUrl = input.logo ? `data:${input.logo.type};base64,${bytesToBase64(input.logo.bytes)}` : undefined;
  const files: Record<string, string | Uint8Array> = {
    "README.md": input.texts.claudeDesignReadme(readmeInfo(input, kinds)),
    ...tokenFiles(input),
    "prompt.md": toPromptPack(doc, "claude-design", input.locale, input.inputs),
  };
  if (input.logo) files["logo.png"] = input.logo.bytes;

  let skippedSections = 0;
  kinds.forEach((kind, index) => {
    const result = renderPage(input, kind, { ...(logoUrl && { logoUrl }), css: [input.css.ui, input.css.sections] });
    skippedSections += result.skipped;
    files[index === 0 ? "preview.html" : `preview-${kind}.html`] = result.html;
  });

  return {
    bytes: zip(`${slug}-claude-design`, files),
    filename: `${slug}-claude-design.zip`,
    type: "application/zip",
    skippedSections,
  };
}
