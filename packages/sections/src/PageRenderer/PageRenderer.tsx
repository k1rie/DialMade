"use client";

import { useMemo, type MouseEvent } from "react";
import type { Locale, OutputKind } from "@dialmade/catalog";
import type { DesignDoc, Page } from "@dialmade/doc";
import { UiProvider } from "@dialmade/ui";
import { buildDefaultPage } from "../buildPage";
import { contentContextFromDoc, linkContext } from "../context";
import { cx } from "../lib/cx";
import { sectionRegistry, type SectionRegistry } from "../registry";
import type { ColorMode, RenderContext } from "../types";
import { ElementView } from "./ElementView";
import type { RenderScope } from "./types";
import "./PageRenderer.css";

export interface PageRendererProps {
  doc: DesignDoc;
  kind: OutputKind;
  /** Defaults to `doc.pages[kind]`, or to `buildDefaultPage` when the doc has no such page. */
  page?: Page;
  mode?: ColorMode;
  /** Defaults to `doc.brief.locale`. */
  locale?: Locale;
  /** Edit mode: elements are selectable (click, Enter, Space) and links do not navigate. */
  interactive?: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Runtime logo (blob or CDN URL). */
  logoUrl?: string;
  seed?: number;
  registry?: SectionRegistry;
  /** Element ids not rendered (with their subtree), like `page.hidden`. */
  exclude?: ReadonlySet<string>;
  onSectionError?: (id: string, error: unknown) => void;
  className?: string;
  /** Layout mode: href of a screen, for links between screens (`null` when it has none). */
  linkHref?: (screenId: string) => string | null;
  /** Layout mode: element id → the screen its primary action links to (the blocks' `linkTo`). */
  links?: Readonly<Record<string, string>>;
  /**
   * Navigable preview: a click on an element carrying `data-dl-screen-link` calls this instead of following
   * the link. Only outside edit mode.
   */
  onNavigate?: (screenId: string) => void;
  /** Layout mode: the page's `toCss` output, rendered in a `<style data-dl-layout>` inside the page. */
  layoutCss?: string;
}

const preventNavigation = (event: MouseEvent<HTMLDivElement>) => {
  if (event.target instanceof Element && event.target.closest("a[href]")) event.preventDefault();
};

const SCREEN_LINK = "[data-dl-screen-link]";

/**
 * Renders a Page of the DesignDoc with the registered sections. It only paints the page: apply the
 * theme variables on an ancestor (`ThemeStyles`).
 */
export function PageRenderer({
  doc,
  kind,
  page: pageProp,
  mode = "light",
  locale,
  interactive = false,
  selectedId,
  onSelect,
  logoUrl,
  seed,
  registry = sectionRegistry,
  exclude,
  onSectionError,
  className,
  linkHref,
  links,
  onNavigate,
  layoutCss,
}: PageRendererProps) {
  const content = useMemo(
    () => contentContextFromDoc(doc, { ...(locale && { locale }), ...(logoUrl && { logoUrl }), ...(seed !== undefined && { seed }) }),
    [doc, locale, logoUrl, seed],
  );
  const stored = pageProp ?? doc.pages[kind];
  const fallbackPage = useMemo(
    () => (stored ? undefined : buildDefaultPage(kind, content, undefined, { registry })),
    [stored, kind, content, registry],
  );
  const page = (stored ?? fallbackPage) as Page;

  const linkCtx = useMemo(() => linkContext({ ...(linkHref && { linkHref }), ...(links && { links }) }), [linkHref, links]);
  const ctx = useMemo<RenderContext>(
    () => ({
      ...content,
      mode,
      interactive,
      ...(onSelect && { onSelect }),
      ...(selectedId !== undefined && { selectedId }),
      doc,
      ...linkCtx,
    }),
    [content, mode, interactive, onSelect, selectedId, doc, linkCtx],
  );
  const navigate =
    onNavigate && !interactive
      ? (event: MouseEvent<HTMLDivElement>) => {
          const link = event.target instanceof Element ? event.target.closest(SCREEN_LINK) : null;
          const screenId = link?.getAttribute("data-dl-screen-link");
          if (!screenId) return;
          event.preventDefault();
          onNavigate(screenId);
        }
      : undefined;
  const hidden = useMemo(() => new Set(page.hidden ?? []), [page.hidden]);
  const scope: RenderScope = {
    page,
    ctx,
    content,
    registry,
    hidden,
    ...(exclude && { exclude }),
    ...(onSectionError && { onSectionError }),
  };

  const root = page.elements[page.root];

  return (
    <UiProvider locale={ctx.locale}>
      <div
        className={cx("dl-page", `dl-page--${kind}`, className)}
        data-dl-kind={kind}
        data-dl-id={page.root}
        data-dl-type={root?.type}
        data-dl-interactive={interactive ? "" : undefined}
        lang={ctx.locale}
        onClickCapture={interactive ? preventNavigation : undefined}
        onClick={navigate}
        onSubmitCapture={interactive ? (event) => event.preventDefault() : undefined}
      >
        {layoutCss ? <style data-dl-layout="">{layoutCss}</style> : null}
        <ElementView id={page.root} scope={scope} isRoot />
      </div>
    </UiProvider>
  );
}
