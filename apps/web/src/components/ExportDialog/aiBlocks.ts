// «Diseño con IA» in the exports (spec §9, track D): which AI blocks a document exports and how. The HTML stored in the
// document is sanitized AGAIN before it goes anywhere (a document can come from a file or a link: its `aiRender` is
// only size-checked by the schema), then `exportBlockHtml` drops the edit handles, points `#screen:` links at the
// exported files and inlines icons and placeholders as SVG. No scripts. Shared by the packs (exportPack) and «Copiar
// HTML / TSX» (AiBlocksCard). Pure: same document, same output.
import {
  PAGE_BASE_CSS,
  blockToTsx,
  chromeLabel,
  chromePieceOf,
  isChromeId,
  exportBlockHtml,
  provenanceComment,
  sanitizeBlock,
  sanitizeCss,
  sanitizeSurfaceClasses,
} from "@dialmade/ai-render";
import { orderedScreens, type DesignDoc, type ScreenId } from "@dialmade/doc";

export type AiExportBlock = {
  screenId: ScreenId;
  screenName: string;
  blockId: string;
  /** The layout's label of the block («Hero»). */
  label: string;
  type: string;
  /** Sanitized again, canonical; absent for a container (its `surface`). */
  html?: string;
  /** A container's surface classes (spec §1 [C15]). */
  surface?: string[];
  /** Page mode: a section of its screen's page (its own CSS and SVG; the screen's page stylesheet styles it). */
  page?: true;
  model?: string;
  createdAt: string;
};

/**
 * Active AI blocks of every screen, in screen order and then reading order (the app frame's pieces first, then rows,
 * then columns). A block whose stored HTML does not survive the sanitizer (or carries hostile markup) is left out: its
 * base design exports.
 */
export function aiExportBlocks(doc: DesignDoc): AiExportBlock[] {
  const screenIds = orderedScreens(doc).map((screen) => screen.id);
  return orderedScreens(doc).flatMap((screen) => {
    const stored = screen.aiRender?.blocks ?? {};
    const layout = screen.layout.blocks;
    const pieceOf = (id: string) => chromePieceOf(screen, id);
    const rowOf = (id: string) => (pieceOf(id) ? -1 : (layout[id]?.rect.row ?? 0));
    const ids = Object.keys(stored).sort((a, b) => {
      const ra = layout[a]?.rect;
      const rb = layout[b]?.rect;
      return rowOf(a) - rowOf(b) || (ra?.col ?? 0) - (rb?.col ?? 0) || (a < b ? -1 : a > b ? 1 : 0);
    });
    return ids.flatMap((blockId): AiExportBlock[] => {
      const block = stored[blockId]!;
      const piece = pieceOf(blockId);
      const element = piece ? { label: chromeLabel(piece.type, doc.brief.locale), type: piece.type } : layout[blockId];
      if (!block.active || !element) return [];
      const base = {
        screenId: screen.id,
        screenName: screen.name,
        blockId,
        label: element.label,
        type: element.type,
        ...(block.provenance.model && { model: block.provenance.model }),
        createdAt: block.provenance.createdAt,
      };
      if (!block.html) {
        const surface = sanitizeSurfaceClasses(block.surfaceClasses ?? []);
        return surface.length > 0 ? [{ ...base, surface }] : [];
      }
      const page = block.mode === "page";
      const sanitized = sanitizeBlock(block.html, { blockId, screenIds, ...(page && { mode: "page" as const }) });
      if (!sanitized.ok || sanitized.report.hostile > 0) return [];
      return [{ ...base, html: sanitized.html, ...(page && { page: true as const }) }];
    });
  });
}

/** Every class token the exported AI blocks use (for `compileAiCss(…, { scoped: true })`). */
export function aiClassTokens(blocks: readonly AiExportBlock[]): string[] {
  const tokens = new Set<string>();
  for (const block of blocks) {
    // Page-mode sections bring their own CSS: their class names are not Tailwind's.
    if (block.page) continue;
    for (const token of block.surface ?? []) tokens.add(token);
    for (const match of (block.html ?? "").matchAll(/\sclass="([^"]*)"/g)) for (const token of match[1]!.split(/\s+/)) if (token) tokens.add(token);
  }
  return [...tokens].sort();
}

export type AiPageParts = {
  /** Element id → static HTML painting it (`renderStaticPage`'s `aiBlocks`), with its provenance comment. */
  aiBlocks: Record<string, string>;
  /** Container id → its surface classes (`aiSurfaces`). */
  aiSurfaces: Record<string, string>;
  /** The app frame's AI pieces (`shell-nav`, `shell-bar`) → their static HTML (`aiChrome`). */
  aiChrome: Record<string, string>;
};

/**
 * The `aiBlocks`/`aiSurfaces` of one screen's page in a pack. Page mode: the screen's page stylesheet (sanitized
 * again, scoped to the AI blocks) travels in a `<style>` with the first section of the page.
 */
export function aiPageParts(
  blocks: readonly AiExportBlock[],
  screenId: ScreenId,
  options: { hrefOf: (screenId: ScreenId) => string | null; logoUrl?: string; locale?: string; pageCss?: string },
): AiPageParts {
  const parts: AiPageParts = { aiBlocks: {}, aiSurfaces: {}, aiChrome: {} };
  let pageStyle = false;
  for (const block of blocks) {
    if (block.screenId !== screenId) continue;
    if (block.surface) parts.aiSurfaces[block.blockId] = block.surface.join(" ");
    if (block.html) {
      const html = exportBlockHtml(block.html, { hrefOf: options.hrefOf, ...(options.logoUrl && { logoUrl: options.logoUrl }), ...(options.locale && { locale: options.locale }) });
      const style = block.page && !pageStyle ? `<style data-dl-page>${PAGE_BASE_CSS}${sanitizeCss(options.pageCss ?? "", { kind: "page" }).css}</style>` : "";
      if (style) pageStyle = true;
      (isChromeId(block.blockId) ? parts.aiChrome : parts.aiBlocks)[block.blockId] = `${provenanceComment(block.model, block.createdAt)}${style}${html}`;
    }
  }
  return parts;
}

/** Screen id → route, for «Copiar HTML/TSX» outside the pack (links go to the app's routes). */
export const screenRoutes = (doc: DesignDoc): Record<ScreenId, string> =>
  Object.fromEntries(orderedScreens(doc).map((screen) => [screen.id, screen.route]));

/** «Copiar HTML»: the block with its provenance, links to the screens' routes and inline SVG assets. */
export function blockHtmlText(block: AiExportBlock, routes: Readonly<Record<ScreenId, string>>, locale?: string): string {
  if (!block.html) return "";
  return `${provenanceComment(block.model, block.createdAt)}\n${exportBlockHtml(block.html, { hrefOf: (id) => routes[id] ?? null, ...(locale && { locale }) })}\n`;
}

/** «Copiar TSX»: one React component for the block (`blockToTsx`). */
export function blockTsxText(block: AiExportBlock, routes: Readonly<Record<ScreenId, string>>, locale?: string): string {
  // Page-mode sections (own CSS and SVG) export as HTML for now; TSX of them is pending.
  if (!block.html || block.page) return "";
  return blockToTsx(block.html, block.blockId, {
    label: block.label,
    routes,
    ...(locale && { locale }),
    ...(block.model && { model: block.model }),
    createdAt: block.createdAt,
  });
}
