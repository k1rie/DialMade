import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Locale, OutputKind } from "@dialmade/catalog";
import type { DesignDoc, Page } from "@dialmade/doc";
import { buildDefaultPage } from "./buildPage";
import { contentContextFromDoc } from "./context";
import { fontsUrlForDoc, themeVarsCss } from "./lib/themeVars";
import { PageRenderer, type PageRendererProps } from "./PageRenderer";
import { sectionRegistry, type SectionRegistry } from "./registry";
import { ThemeStyles } from "./ThemeStyles";
import type { ColorMode } from "./types";

export interface RenderStaticPageOptions {
  mode?: ColorMode;
  /** Defaults to `doc.brief.locale`. */
  locale?: Locale;
  /** Defaults to `doc.pages[kind]`, or to `buildDefaultPage`. */
  page?: Page;
  logoUrl?: string;
  seed?: number;
  /** `<title>`; defaults to the brand name. */
  title?: string;
  /** CSS inlined in the head, e.g. `await readBundledCss()` from `@dialmade/sections/node`. */
  css?: string | readonly string[];
  /** Stylesheets linked in the head, e.g. hosted copies of dialmade-ui.css and dialmade-sections.css. */
  stylesheets?: readonly string[];
  /** Google Fonts of the doc: its own families, or the pairing's (default true). */
  fonts?: boolean;
  registry?: SectionRegistry;
  /** A section that throws is left out of the HTML and reported here. */
  onSectionError?: (id: string, error: unknown) => void;
  /** Layout mode: href of a screen, for real links between exported screens (`null` when it has none). */
  linkHref?: (screenId: string) => string | null;
  /** Layout mode: element id → the screen its primary action links to (the blocks' `linkTo`). */
  links?: Readonly<Record<string, string>>;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Closing tags cannot appear inside <style>. */
const escapeStyle = (css: string) => css.replace(/<\/(style)/gi, "<\\/$1");

/** Root plus one element (without its children). */
function isolate(page: Page, id?: string): Page {
  const root = page.elements[page.root];
  const element = id === undefined ? undefined : page.elements[id];
  if (!root) return page;
  return {
    ...page,
    hidden: [],
    elements: {
      [page.root]: { ...root, children: element && id ? [id] : [] },
      ...(element && id ? { [id]: { ...element, children: [] } } : {}),
    },
  };
}

/**
 * React has no error boundaries on the server, so each visible element is first rendered alone: the
 * ones that throw are left out of the final render (with their subtree).
 */
function failingElements(base: PageRendererProps & { page: Page }, onError?: (id: string, error: unknown) => void): Set<string> {
  const { page } = base;
  const failed = new Set<string>();
  const attempt = (id?: string) => {
    try {
      renderToStaticMarkup(createElement(PageRenderer, { ...base, page: isolate(page, id), exclude: failed }));
      return true;
    } catch (error) {
      const failedId = id ?? page.root;
      failed.add(failedId);
      onError?.(failedId, error);
      return false;
    }
  };
  attempt();
  const hidden = new Set(page.hidden ?? []);
  const visit = (id: string) => {
    const element = page.elements[id];
    if (!element || hidden.has(id) || !attempt(id)) return;
    element.children.forEach(visit);
  };
  page.elements[page.root]?.children.forEach(visit);
  return failed;
}

/**
 * A complete, self-contained HTML document of one page of the doc: theme variables in a <style>,
 * Google Fonts of the pairing, the kit CSS (inline and/or linked) and the static markup of the sections.
 */
export function renderStaticPage(
  doc: DesignDoc,
  kind: OutputKind,
  vars: Readonly<Record<string, string>>,
  options: RenderStaticPageOptions = {},
): string {
  const mode = options.mode ?? "light";
  const locale = options.locale ?? doc.brief.locale;
  const registry = options.registry ?? sectionRegistry;
  const content = contentContextFromDoc(doc, {
    locale,
    ...(options.logoUrl && { logoUrl: options.logoUrl }),
    ...(options.seed !== undefined && { seed: options.seed }),
  });
  const page = options.page ?? doc.pages[kind] ?? buildDefaultPage(kind, content, undefined, { registry });

  const base: PageRendererProps & { page: Page } = {
    doc,
    kind,
    page,
    mode,
    locale,
    registry,
    ...(options.logoUrl && { logoUrl: options.logoUrl }),
    ...(options.seed !== undefined && { seed: options.seed }),
    ...(options.linkHref && { linkHref: options.linkHref }),
    ...(options.links && { links: options.links }),
  };
  const exclude = failingElements(base, options.onSectionError);
  const body = renderToStaticMarkup(
    createElement(ThemeStyles, { mode, fontsHref: null }, createElement(PageRenderer, { ...base, exclude })),
  );

  const fontsHref = options.fonts === false ? undefined : fontsUrlForDoc(doc);
  const css = typeof options.css === "string" ? [options.css] : (options.css ?? []);
  const head = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<meta name="generator" content="Dialmade">`,
    `<title>${escapeHtml(options.title ?? doc.brand.name)}</title>`,
    ...(doc.brand.tagline ? [`<meta name="description" content="${escapeHtml(doc.brand.tagline)}">`] : []),
    ...(fontsHref
      ? [
          `<link rel="preconnect" href="https://fonts.googleapis.com">`,
          `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
          `<link rel="stylesheet" href="${escapeHtml(fontsHref)}">`,
        ]
      : []),
    `<style id="dl-theme-vars">${escapeStyle(themeVarsCss(vars))}html,body{margin:0;padding:0}body{background:var(--background);color:var(--foreground);color-scheme:${mode}}</style>`,
    ...(options.stylesheets ?? []).map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`),
    ...css.filter((text) => text.trim() !== "").map((text) => `<style>${escapeStyle(text)}</style>`),
  ];

  return [
    "<!doctype html>",
    `<html lang="${locale}" data-dl-mode="${mode}" data-dl-kind="${kind}">`,
    `<head>\n${head.join("\n")}\n</head>`,
    `<body>\n${body}\n</body>`,
    "</html>",
    "",
  ].join("\n");
}
