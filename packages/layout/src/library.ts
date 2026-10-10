import type {
  AppNav,
  BlockCategory,
  LibraryBlockDef,
  LibraryBlockType,
  MobileBehavior,
  ScreenKind,
} from "./types";

/** Library categories in display order. */
export const BLOCK_CATEGORIES: readonly BlockCategory[] = [
  "basics",
  "navigation",
  "content",
  "data",
  "forms",
  "overlays",
  "commerce",
];

const LANDING: readonly ScreenKind[] = ["landing"];
const APP: readonly ScreenKind[] = ["app"];
const BOTH: readonly ScreenKind[] = ["landing", "app"];
const APP_FIRST: readonly ScreenKind[] = ["app", "landing"];

type DefInput = {
  sectionType: string;
  size: [w: number, h: number];
  /** Min columns on desktop / tablet / mobile. */
  min: [desktop: number, tablet: number, mobile: number];
  container?: boolean;
  accepts?: LibraryBlockDef["accepts"];
  repeatable?: [min: number, max: number, def: number];
  mobile: [MobileBehavior, ...MobileBehavior[]];
  overlay?: boolean;
  frame?: Exclude<AppNav, "none" | "rail">;
  kinds: readonly ScreenKind[];
};

function def(type: LibraryBlockType, category: BlockCategory, status: "ready" | "soon", input: DefInput): LibraryBlockDef {
  const [first] = input.mobile;
  return {
    type,
    category,
    icon: type,
    status,
    sectionType: input.sectionType,
    defaultSize: { w: input.size[0], h: input.size[1] },
    minCols: { desktop: input.min[0], tablet: input.min[1], mobile: input.min[2] },
    container: input.container ?? false,
    accepts: input.accepts ?? [],
    repeatable: input.repeatable
      ? { min: input.repeatable[0], max: input.repeatable[1], default: input.repeatable[2] }
      : null,
    mobile: first,
    mobileOptions: input.mobile,
    overlay: input.overlay ?? false,
    frame: input.frame ?? null,
    kinds: input.kinds,
  };
}

/** «Pronto» blocks: placeable, compiled to `ui.placeholder` until their section exists. */
function soon(
  type: LibraryBlockType,
  category: BlockCategory,
  size: [number, number],
  min: [number, number, number],
  repeatable: [number, number, number] | null,
  mobile: [MobileBehavior, ...MobileBehavior[]],
  kinds: readonly ScreenKind[],
): LibraryBlockDef {
  return def(type, category, "soon", {
    sectionType: "ui.placeholder",
    size,
    min,
    ...(repeatable ? { repeatable } : {}),
    mobile,
    kinds,
  });
}

/**
 * Structural metadata of every block, in display order: categories in `BLOCK_CATEGORIES` order and, inside
 * each one, ready blocks before «soon» ones. Names and synonyms live in the app's i18n, not here.
 */
export const LIBRARY: readonly LibraryBlockDef[] = [
  // basics
  def("free", "basics", "ready", {
    sectionType: "ui.placeholder",
    size: [4, 20],
    min: [1, 2, 4],
    mobile: ["stack", "hide"],
    kinds: BOTH,
  }),
  def("container", "basics", "ready", {
    sectionType: "ui.region",
    size: [12, 40],
    min: [2, 3, 4],
    container: true,
    accepts: "any",
    mobile: ["stack", "carousel", "hide"],
    kinds: BOTH,
  }),
  // navigation
  def("navbar", "navigation", "ready", {
    sectionType: "landing.navbar",
    size: [12, 8],
    min: [6, 8, 4],
    mobile: ["hamburger", "stack", "hide"],
    frame: "topnav",
    kinds: LANDING,
  }),
  def("sidebar", "navigation", "ready", {
    sectionType: "app.shell",
    size: [3, 80],
    min: [1, 1, 4],
    mobile: ["drawer", "tabbar", "hide"],
    frame: "sidebar",
    kinds: APP,
  }),
  def("footer", "navigation", "ready", {
    sectionType: "landing.footer",
    size: [12, 25],
    min: [6, 8, 4],
    mobile: ["accordion", "stack", "hide"],
    kinds: LANDING,
  }),
  soon("tabs", "navigation", [12, 6], [4, 6, 4], [2, 8, 3], ["scroll-x", "stack", "hide"], APP_FIRST),
  soon("stepper", "navigation", [12, 8], [6, 6, 4], [2, 6, 3], ["scroll-x", "stack", "hide"], APP),
  soon("pagination", "navigation", [6, 6], [3, 4, 4], null, ["stack", "hide"], APP),
  // content
  def("hero", "content", "ready", {
    sectionType: "landing.hero",
    size: [12, 60],
    min: [6, 8, 4],
    accepts: ["media", "text", "form"],
    mobile: ["text-first", "stack", "hide"],
    kinds: LANDING,
  }),
  def("features", "content", "ready", {
    sectionType: "landing.features",
    size: [12, 40],
    min: [6, 8, 4],
    repeatable: [1, 6, 3],
    mobile: ["one-column", "carousel", "hide"],
    kinds: LANDING,
  }),
  def("logos", "content", "ready", {
    sectionType: "landing.socialProof",
    size: [12, 12],
    min: [4, 8, 4],
    repeatable: [1, 8, 6],
    mobile: ["scroll-x", "stack", "hide"],
    kinds: LANDING,
  }),
  def("testimonials", "content", "ready", {
    sectionType: "landing.testimonials",
    size: [12, 40],
    min: [4, 4, 4],
    repeatable: [1, 6, 3],
    mobile: ["carousel", "one-column", "hide"],
    kinds: LANDING,
  }),
  def("pricing", "content", "ready", {
    sectionType: "landing.pricing",
    size: [12, 60],
    min: [6, 8, 4],
    repeatable: [1, 4, 3],
    mobile: ["one-column", "carousel", "hide"],
    kinds: LANDING,
  }),
  def("cta", "content", "ready", {
    sectionType: "landing.cta",
    size: [12, 25],
    min: [4, 4, 4],
    mobile: ["stack", "hide"],
    kinds: LANDING,
  }),
  def("text", "content", "ready", {
    sectionType: "ui.text",
    size: [6, 20],
    min: [2, 3, 4],
    mobile: ["stack", "hide"],
    kinds: BOTH,
  }),
  def("media", "content", "ready", {
    sectionType: "ui.media",
    size: [6, 40],
    min: [2, 3, 4],
    mobile: ["stack", "hide"],
    kinds: BOTH,
  }),
  soon("faq", "content", [8, 40], [4, 6, 4], [1, 12, 5], ["accordion", "stack", "hide"], LANDING),
  soon("banner", "content", [12, 8], [6, 8, 4], null, ["stack", "hide"], BOTH),
  soon("timeline", "content", [6, 40], [3, 4, 4], [2, 12, 4], ["stack", "hide"], LANDING),
  // data
  def("kpis", "data", "ready", {
    sectionType: "app.kpiRow",
    size: [12, 14],
    min: [3, 4, 4],
    repeatable: [1, 6, 4],
    mobile: ["grid-2x2", "scroll-x", "one-column", "hide"],
    kinds: APP,
  }),
  def("chart", "data", "ready", {
    sectionType: "app.chartCard",
    size: [8, 40],
    min: [3, 4, 4],
    mobile: ["stack", "hide"],
    kinds: APP,
  }),
  def("table", "data", "ready", {
    sectionType: "app.dataTable",
    size: [12, 50],
    min: [5, 6, 4],
    mobile: ["card-list", "scroll-x", "hide"],
    kinds: APP,
  }),
  def("activity", "data", "ready", {
    sectionType: "app.activity",
    size: [4, 40],
    min: [3, 3, 4],
    mobile: ["stack", "hide"],
    kinds: APP,
  }),
  def("cards", "data", "ready", {
    sectionType: "ui.cards",
    size: [12, 30],
    min: [3, 3, 4],
    repeatable: [1, 12, 3],
    mobile: ["one-column", "carousel", "hide"],
    kinds: BOTH,
  }),
  def("calendar", "data", "ready", {
    sectionType: "ui.calendar",
    size: [8, 60],
    min: [3, 6, 4],
    mobile: ["agenda", "stack", "hide"],
    kinds: APP,
  }),
  def("list", "data", "ready", {
    sectionType: "ui.list",
    size: [4, 40],
    min: [2, 3, 4],
    mobile: ["stack", "hide"],
    kinds: APP,
  }),
  soon("kanban", "data", [12, 50], [6, 8, 4], [2, 6, 3], ["scroll-x", "stack", "hide"], APP),
  soon("search", "data", [6, 6], [3, 4, 4], null, ["stack", "hide"], APP),
  // forms
  def("settings", "forms", "ready", {
    sectionType: "app.settingsForm",
    size: [8, 50],
    min: [4, 5, 4],
    mobile: ["stack", "hide"],
    kinds: APP,
  }),
  def("form", "forms", "ready", {
    sectionType: "ui.form",
    size: [6, 50],
    min: [3, 4, 4],
    mobile: ["stack", "hide"],
    kinds: BOTH,
  }),
  soon("upload", "forms", [6, 25], [3, 4, 4], null, ["stack", "hide"], APP),
  // overlays
  def("modal", "overlays", "ready", {
    sectionType: "app.confirmDialog",
    size: [6, 30],
    min: [3, 4, 4],
    container: true,
    accepts: ["form", "text", "list", "media", "table"],
    mobile: ["sheet", "hide"],
    overlay: true,
    kinds: APP,
  }),
  def("empty", "overlays", "ready", {
    sectionType: "app.emptyState",
    size: [6, 30],
    min: [3, 4, 4],
    mobile: ["stack", "hide"],
    kinds: APP,
  }),
  soon("notifications", "overlays", [4, 40], [3, 4, 4], null, ["sheet", "stack", "hide"], APP),
  // commerce
  soon("gallery", "commerce", [12, 40], [4, 6, 4], [2, 24, 6], ["carousel", "one-column", "hide"], LANDING),
  soon("chat", "commerce", [8, 60], [4, 6, 4], null, ["stack", "hide"], APP),
  soon("profile", "commerce", [4, 30], [3, 4, 4], null, ["stack", "hide"], APP),
  soon("map", "commerce", [8, 40], [3, 4, 4], null, ["stack", "hide"], LANDING),
  soon("cart", "commerce", [4, 40], [3, 4, 4], null, ["sheet", "stack", "hide"], LANDING),
  soon("checkout", "commerce", [8, 60], [4, 6, 4], null, ["stack", "hide"], LANDING),
  soon("video", "commerce", [8, 45], [3, 4, 4], null, ["stack", "hide"], LANDING),
];

const BY_TYPE: ReadonlyMap<string, LibraryBlockDef> = new Map(LIBRARY.map((d) => [d.type, d]));

/** Type guard for library block types. */
export function isLibraryBlockType(value: unknown): value is LibraryBlockType {
  return typeof value === "string" && BY_TYPE.has(value);
}

/** Metadata of a block type. Throws on an unknown type. */
export function getBlockDef(type: LibraryBlockType): LibraryBlockDef {
  const found = BY_TYPE.get(type);
  if (!found) throw new TypeError(`Unknown layout block type: ${JSON.stringify(type)}`);
  return found;
}

/** Like `getBlockDef`, but never throws: unknown types read as «Bloque libre» (engine paths on bad input). */
export function blockDefOrFree(type: unknown): LibraryBlockDef {
  return (typeof type === "string" ? BY_TYPE.get(type) : undefined) ?? BY_TYPE.get("free")!;
}

/** Blocks of a category, in display order. */
export function blocksInCategory(category: BlockCategory): LibraryBlockDef[] {
  return LIBRARY.filter((d) => d.category === category);
}

/** Can the block of type `childType` mean something inside `parentType` (containers accept anything)? */
export function acceptsChild(parentType: LibraryBlockType, childType: LibraryBlockType): boolean {
  const parent = blockDefOrFree(parentType);
  if (parent.container || parent.accepts === "any") return true;
  return parent.accepts.includes(childType);
}
