// What the prompts receive (spec §3.1), built from the DesignDoc: the screen's blocks in reading order with their
// type, label, note, count and size, the deterministic draft of their copy, and the brand as structured traits.
// Never hex colors (the model does not need them and would copy them) and never imported prose [C5].
import { getProductType, getStyleRecipe } from "@dialmade/catalog";
import type { DesignDoc, Screen } from "@dialmade/doc";
import { ROW_UNIT, absorbChildren, inferStructure } from "@dialmade/layout";
import { hexToOklch } from "@dialmade/palette";
import { chromeBlockInput, chromePieces, AI_SHELL_ELEMENT_ID, CHROME_TYPES } from "./chrome";
import type { PageSectionData, RenderBlockInput, RenderBrandInput, RenderScreenInput } from "./prompt";

/** Block types whose children are other blocks: they only get a surface in the MVP (spec §1 [C15]). */
export const CONTAINER_TYPES: ReadonlySet<string> = new Set(["container", "modal"]);
/** Block types shared between screens (generated once, cloned: spec §4.3), the app frame's pieces (./chrome) included. */
export const KIT_TYPES: ReadonlySet<string> = new Set(["navbar", "footer", ...CHROME_TYPES]);

const MAX_DRAFT_TEXTS = 40;
const MAX_DRAFT_LENGTH = 200;

/** Every string of a props object, depth first (the visible copy of a section), deduplicated and capped. */
export function draftTexts(props: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (value: unknown, key: string) => {
    if (out.length >= MAX_DRAFT_TEXTS) return;
    if (typeof value === "string") {
      const text = value.replace(/\s+/g, " ").trim();
      // Keys that are not copy (variants, ids, icons, links, bindings to the brand: the brand travels apart).
      if (!text || /^(variant|id|icon|href|link|linkTo|screen|route|image|src|tone|align|emphasis|background|spacing|level|kind|layout|ratio|bind)$/i.test(key)) return;
      if (/^[a-z0-9_-]+$/.test(text) && text.length < 24 && !text.includes(" ")) return;
      if (seen.has(text)) return;
      seen.add(text);
      out.push(text.slice(0, MAX_DRAFT_LENGTH));
      return;
    }
    // Prices, amounts and counts are numbers in the props: they travel as «key: value» so the model keeps them.
    if (typeof value === "number" && Number.isFinite(value) && /price|amount|value|total|count|monthly|yearly|percent/i.test(key)) {
      const text = `${key}: ${value}`;
      if (!seen.has(text)) {
        seen.add(text);
        out.push(text);
      }
      return;
    }
    if (Array.isArray(value)) value.forEach((item) => visit(item, key));
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) visit(v, k);
  };
  visit(props, "");
  return out;
}

const chromaClass = (c: number): RenderBrandInput["palette"]["chroma"] => (c < 0.04 ? "neutral" : c < 0.12 ? "muted" : "vivid");

export function brandInput(doc: DesignDoc, options: { description?: string; fingerprint?: Record<string, string> } = {}): RenderBrandInput {
  const recipe = getStyleRecipe(doc.brief.recipeId);
  const product = getProductType(doc.brief.productType);
  const primary = hexToOklch(doc.brand.seeds.primary) ?? { l: 0.5, c: 0, h: 0 };
  const secondary = doc.brand.seeds.secondary ? hexToOklch(doc.brand.seeds.secondary) : null;
  const description = options.description ?? doc.provenance.layoutBrief?.description;
  return {
    name: doc.brand.name,
    ...(doc.brand.tagline && { tagline: doc.brand.tagline }),
    productType: product ? `${product.id}: ${product.label.en}` : doc.brief.productType,
    ...(description && { description }),
    palette: {
      hue: Math.round(primary.h ?? 0),
      chroma: chromaClass(primary.c),
      ...(secondary && secondary.c >= 0.04 && { secondaryHue: Math.round(secondary.h ?? 0) }),
      preferredMode: recipe?.preferredMode ?? "light",
    },
    recipe: recipe
      ? {
          id: recipe.id,
          surface: recipe.surface,
          shape: recipe.button.shape,
          density: recipe.card.padding,
          mood: `${recipe.label.en}: ${recipe.description.en}`.slice(0, 200),
        }
      : { id: doc.brief.recipeId, surface: "flat", shape: "rounded", density: "normal", mood: "" },
    ...(options.fingerprint && { fingerprint: options.fingerprint }),
  };
}

export type ScreenInputOptions = {
  /** Visible copy of a block's element (`visibleProps` of @dialmade/sections → `draftTexts`). */
  draftOf: (blockId: string) => string[];
  /**
   * «page»: the screen is designed as one page from the brief (./pagePrompt): no template copy travels, only the fixed
   * values of `dataOf` (plan names and prices).
   */
  mode?: "page";
  /** Page mode: the visible props of a block's element (`visibleProps`), read for `pageSectionData`. */
  propsOf?: (blockId: string) => unknown;
  /** The frame's visible props (`visibleProps` of the `shell` element) for its AI pieces; its stored props otherwise. */
  shellProps?: unknown;
  /** Block ids that are not sent (already designed: kit pieces cloned from another screen). */
  skip?: ReadonlySet<string>;
  /** Only these block ids (a retry of some blocks). */
  only?: ReadonlySet<string>;
};

/** The blocks of a screen that have an element of their own on the page, in reading order. */
export function renderableBlocks(screen: Pick<Screen, "layout" | "page">): string[] {
  const { layout } = absorbChildren(screen.layout);
  const order = inferStructure(layout).order;
  return order.filter((id) => Object.hasOwn(screen.page.elements, id) && !layout.blocks[id]?.hidden);
}

/** Everything «Diseño con IA» designs on a screen, in reading order: the frame's pieces (./chrome), then the blocks. */
export function aiPieceIds(screen: Pick<Screen, "kind" | "shell" | "layout" | "page">): string[] {
  return [...chromePieces(screen).map((piece) => piece.id), ...renderableBlocks(screen)];
}

/** The block that may hold the screen's h1 (gate 6): a landing's hero, else its first non-navigation block. */
export function h1BlockOf(screen: Pick<Screen, "kind" | "shell" | "layout">, ids: readonly string[]): string | null {
  const type = (id: string) => screen.layout.blocks[id]?.type;
  if (screen.kind === "app" && screen.shell?.header) return null;
  return ids.find((id) => type(id) === "hero") ?? ids.find((id) => !KIT_TYPES.has(type(id) ?? "") && type(id) !== "sidebar" && !CONTAINER_TYPES.has(type(id) ?? "")) ?? null;
}

/** Fixed values a section must keep in page mode: the plans of a pricing block (name, price, highlighted), nothing else. */
export function pageSectionData(props: unknown): PageSectionData | undefined {
  if (!props || typeof props !== "object") return undefined;
  const { plans, count, recurring } = props as { plans?: unknown; count?: unknown; recurring?: unknown };
  if (!Array.isArray(plans)) return undefined;
  const shown = typeof count === "number" ? plans.slice(0, count) : plans;
  const out = shown.flatMap((plan) => {
    const { name, price, highlighted } = (plan ?? {}) as { name?: unknown; price?: unknown; highlighted?: unknown };
    return typeof name === "string" && typeof price === "number" ? [{ name: name.slice(0, 60), price, highlighted: highlighted === true }] : [];
  });
  return out.length > 0 ? { plans: out, ...(typeof recurring === "boolean" && { recurring }) } : undefined;
}

export function blockInput(screen: Screen, id: string, draft: string[], h1: boolean, data?: PageSectionData): RenderBlockInput {
  const block = screen.layout.blocks[id]!;
  return {
    id,
    type: block.type,
    label: block.label,
    ...(block.note && { note: block.note }),
    ...(block.count !== undefined && { count: block.count }),
    cols: block.rect.w,
    heightPx: block.rect.h * ROW_UNIT,
    ...(block.linkTo && { linksTo: block.linkTo }),
    ...(CONTAINER_TYPES.has(block.type) && { container: true as const }),
    ...(h1 && { h1: true as const }),
    draft: CONTAINER_TYPES.has(block.type) ? [] : draft,
    ...(data && { data }),
  };
}

export function screenInput(doc: DesignDoc, screenId: string, options: ScreenInputOptions): RenderScreenInput {
  const screen = doc.screens[screenId];
  if (!screen) throw new TypeError(`Unknown screen ${screenId}`);
  const ids = renderableBlocks(screen);
  const h1 = h1BlockOf(screen, ids);
  const wanted = (id: string) => !options.skip?.has(id) && (!options.only || options.only.has(id));
  const screenIds = new Set(doc.screenOrder);
  const chrome = chromePieces(screen)
    .filter((piece) => wanted(piece.id))
    .map((piece) => chromeBlockInput(piece, options.shellProps ?? screen.page.elements[AI_SHELL_ELEMENT_ID]?.props, { locale: doc.brief.locale, screenIds, brandName: doc.brand.name }));
  const blocks = ids
    .filter(wanted)
    .map((id) =>
      options.mode === "page"
        ? blockInput(screen, id, [], id === h1, options.propsOf ? pageSectionData(options.propsOf(id)) : undefined)
        : blockInput(screen, id, options.draftOf(id), id === h1),
    );
  return {
    id: screen.id,
    name: screen.name,
    kind: screen.kind,
    route: screen.route,
    locale: doc.brief.locale,
    screens: doc.screenOrder.filter((other) => other !== screen.id && doc.screens[other]).map((other) => ({ id: other, name: doc.screens[other]!.name })),
    blocks: [...chrome, ...blocks],
    ...(options.mode === "page" && { mode: "page" as const }),
  };
}
