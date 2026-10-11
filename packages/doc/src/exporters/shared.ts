import {
  GENERIC_PRODUCT_ID,
  getProductType,
  outputKindOptions,
  type Locale,
  type OutputKind,
  type StyleRecipe,
  type ThemeRecipe,
} from "@dialmade/catalog";
import type { CssColorFormat } from "@dialmade/palette";
import { resolveBindings } from "../bindings";
import { legacyPageKinds } from "../screens";
import { LAYOUT_PAGE_ID } from "../constants";
import type { DesignDoc, Dials, Page, PageElement } from "../schema";
import { resolveThemeInputs, resolveTokens, type ResolvedTokens, type ThemeInputs } from "../tokens";

/**
 * What a recipe reports to the outside: `recipeId` is always the catalog recipe (the archetype) and `themeId`
 * appears when an imported variant (daisyUI, tweakcn) is applied on top of it.
 */
export function recipeIds(recipe: StyleRecipe): { recipeId: string; themeId?: string } {
  const variant = recipe as Partial<ThemeRecipe>;
  return variant.themeId && variant.archetypeId ? { recipeId: variant.archetypeId, themeId: variant.themeId } : { recipeId: recipe.id };
}

/** Shared by every exporter. Missing inputs are resolved from the doc via @dialmade/catalog and @dialmade/palette. */
export interface ExportOptions extends Partial<ThemeInputs> {
  /** Page dials on top of `doc.brief.dials`. Exports default to the global dials. */
  pageDials?: Partial<Dials>;
  colorFormat?: CssColorFormat;
  /**
   * Screen pages only: an element's props as the page shows them (`visibleProps` of @dialmade/sections), so
   * the page outline never lists the items a `count` hides. Without it the outline lists every stored item.
   */
  visibleProps?: (element: PageElement) => Record<string, unknown>;
}

export interface ResolvedExport {
  inputs: ThemeInputs;
  light: ResolvedTokens;
  dark: ResolvedTokens;
}

export function resolveExport(doc: DesignDoc, options: ExportOptions = {}): ResolvedExport {
  const inputs = resolveThemeInputs(doc, options);
  const base = { ...inputs, ...(options.pageDials && { pageDials: options.pageDials }) };
  return {
    inputs,
    light: resolveTokens(doc, { ...base, mode: "light" }),
    dark: resolveTokens(doc, { ...base, mode: "dark" }),
  };
}

export const productLabel = (doc: DesignDoc, locale: Locale): string =>
  doc.brief.productType === GENERIC_PRODUCT_ID
    ? locale === "es"
      ? "Genérico"
      : "Generic"
    : (getProductType(doc.brief.productType)?.label[locale] ?? doc.brief.productType);

export const kindLabel = (kind: OutputKind, locale: Locale): string =>
  outputKindOptions.find((option) => option.id === kind)?.label[locale] ?? kind;

const SECTION_LABELS: Record<string, { es: string; en: string }> = {
  "landing.navbar": { es: "Barra de navegación", en: "Navigation bar" },
  "landing.hero": { es: "Hero", en: "Hero" },
  "landing.socialProof": { es: "Prueba social", en: "Social proof" },
  "landing.features": { es: "Funcionalidades", en: "Features" },
  "landing.testimonials": { es: "Testimonios", en: "Testimonials" },
  "landing.pricing": { es: "Precios", en: "Pricing" },
  "landing.cta": { es: "Llamada a la acción", en: "Call to action" },
  "landing.footer": { es: "Pie de página", en: "Footer" },
  "brand.cover": { es: "Portada", en: "Cover" },
  "brand.identity": { es: "01 Identidad", en: "01 Identity" },
  "brand.palette": { es: "02 Paleta", en: "02 Palette" },
  "brand.type": { es: "03 Tipografía", en: "03 Typography" },
  "brand.shape": { es: "04 Formas", en: "04 Shapes" },
  "brand.components": { es: "05 Componentes", en: "05 Components" },
  "brand.artDirection": { es: "06 Dirección de arte", en: "06 Art direction" },
  "app.shell": { es: "Shell (sidebar y topbar)", en: "Shell (sidebar and top bar)" },
  "app.kpiRow": { es: "Fila de KPIs", en: "KPI row" },
  "app.chartCard": { es: "Gráfica", en: "Chart card" },
  "app.dataTable": { es: "Tabla de datos", en: "Data table" },
  "app.activity": { es: "Actividad", en: "Activity" },
  "app.settingsForm": { es: "Formulario de ajustes", en: "Settings form" },
  "app.emptyState": { es: "Estado vacío", en: "Empty state" },
  "app.confirmDialog": { es: "Diálogo de confirmación", en: "Confirm dialog" },
  "app.componentGallery": { es: "Galería de componentes", en: "Component gallery" },
  "ui.text": { es: "Texto", en: "Text" },
  "ui.media": { es: "Media", en: "Media" },
  "ui.cards": { es: "Tarjetas", en: "Cards" },
  "ui.calendar": { es: "Calendario", en: "Calendar" },
  "ui.list": { es: "Lista", en: "List" },
  "ui.form": { es: "Formulario", en: "Form" },
  "ui.placeholder": { es: "Bloque libre", en: "Free block" },
  "ui.region": { es: "Contenedor", en: "Container" },
};

export const sectionLabel = (type: string, locale: Locale): string =>
  Object.hasOwn(SECTION_LABELS, type) ? SECTION_LABELS[type]![locale] : type;

export interface OutlineItem {
  id: string;
  type: string;
  depth: number;
  hidden: boolean;
  /** Top-level string props after resolving bindings. */
  text: Record<string, string>;
  /** List props (features, plans, quotes, links, KPIs…), one compact line per item. */
  lists: Record<string, string[]>;
}

const MAX_TEXT = 140;
const MAX_ITEM_TEXT = 160;
const MAX_LIST_ITEMS = 12;
/** Keys of list items that are not copy (links, ids, icons, flags). */
const NON_COPY_KEY = /^(id|key|href|url|src|icon|image|logo|avatar|variant|tone|color|kind|type|highlighted|featured|active|linkTo|route|screen)$/i;

const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

/** A list of numbers or flags (chart series, sparklines): data, not copy. */
const isData = (value: readonly unknown[]) => value.every((item) => typeof item !== "string" && typeof item !== "object");

/** The copy of one list item: strings and numbers of its fields, nested lists joined with commas. */
function itemCopy(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return isData(value) ? "" : value.map(itemCopy).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !NON_COPY_KEY.test(key))
      .map(([, field]) => itemCopy(field))
      .filter(Boolean)
      .join(" — ");
  }
  return "";
}

/** A prop that is a list of copy (not chart data: a list of numbers is skipped). */
function listCopy(value: readonly unknown[]): string[] {
  if (isData(value)) return [];
  return value
    .slice(0, MAX_LIST_ITEMS)
    .map((item) => clip(itemCopy(item), MAX_ITEM_TEXT))
    .filter(Boolean);
}

/**
 * Structural elements of a screen page (the layout scope and the inferred regions, `ui.region` with
 * `role: "scope" | "inferred"`): the outline skips them and lists their children at the same depth.
 */
const isStructural = (id: string, element: { type: string; props: Record<string, unknown> }) =>
  element.type === "ui.region" &&
  (element.props.role === "scope" || element.props.role === "inferred" || id === "layout" || id.startsWith("r-"));

/**
 * Depth-first outline of a page below its root (structural regions of a screen page are transparent). On a
 * screen page, `visibleProps` (see `ExportOptions`) projects each element's props to what it shows first.
 */
export function pageOutline(doc: DesignDoc, page: Page, visibleProps?: ExportOptions["visibleProps"]): OutlineItem[] {
  const hidden = new Set(page.hidden ?? []);
  const project = page.layoutId === LAYOUT_PAGE_ID ? visibleProps : undefined;
  const out: OutlineItem[] = [];
  const visit = (id: string, depth: number, parentHidden: boolean) => {
    const element = page.elements[id];
    if (!element) return;
    const isHidden = parentHidden || hidden.has(id);
    const transparent = id === page.root || isStructural(id, element);
    if (!transparent) {
      const props = resolveBindings(doc, project ? project(element) : element.props);
      const text: Record<string, string> = {};
      const lists: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(props)) {
        if (typeof value === "string" && value.trim()) text[key] = clip(value, MAX_TEXT);
        else if (Array.isArray(value)) {
          const items = listCopy(value);
          if (items.length > 0) lists[key] = items;
        }
      }
      out.push({ id, type: element.type, depth, hidden: isHidden, text, lists });
    }
    for (const child of element.children) visit(child, transparent ? depth : depth + 1, isHidden);
  };
  visit(page.root, 0, false);
  return out;
}

/** Legacy pages in export order (focus first). Documents with screens export `renderTargets`. */
export const pageKinds = (doc: DesignDoc): OutputKind[] => legacyPageKinds(doc);

/** `"-apple-system, 'Segoe UI', sans-serif"` → `["-apple-system", "Segoe UI", "sans-serif"]`. */
export function splitFontStack(stack: string): string[] {
  return stack
    .split(",")
    .map((part) => part.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

/** Dark when the palette style or the recipe prefers it. */
export const preferredMode = (inputs: ThemeInputs): "light" | "dark" =>
  inputs.theme.defaultMode === "dark" || inputs.recipe.preferredMode === "dark" ? "dark" : "light";

/** Spacing names used where a scale needs words (DESIGN.md): index 0 is `--dl-space-1`. */
export const SPACE_NAMES = ["xxs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"] as const;

/** One outline item as Markdown: the section with its text props, then a line per list prop. */
export function outlineItemLines(item: OutlineItem, head: string, indent: string, hiddenLabel: string): string[] {
  const text = Object.entries(item.text)
    .map(([key, value]) => `${key}: "${value}"`)
    .join(" · ");
  const lists = Object.entries(item.lists).map(
    ([key, items]) => `${indent}   ${key}: ${items.map((entry) => `"${entry.replace(/"/g, "'")}"`).join("; ")}`,
  );
  return [`${indent}${head}${item.hidden ? ` — ${hiddenLabel}` : ""}${text ? ` — ${text}` : ""}`, ...lists];
}

/** Markdown table. Cells are escaped for `|`. */
export function mdTable(head: readonly string[], rows: readonly (readonly (string | number)[])[]): string {
  const cell = (value: string | number) => String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${head.map(cell).join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}
