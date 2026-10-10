import { DESKTOP_COLUMNS } from "./constants";
import { bottom, roundRect, sameRect } from "./geometry";
import { blockDefOrFree, LIBRARY } from "./library";
import type { BlockId, GridRect, LayoutDoc, LibraryBlockType, ScreenKind } from "./types";

const SUGGESTION_COUNT = 5;

const LANDING_EMPTY: readonly LibraryBlockType[] = ["navbar", "hero", "features", "cta", "footer"];
const LANDING_PRIORITY: readonly LibraryBlockType[] = [
  "navbar",
  "hero",
  "features",
  "logos",
  "testimonials",
  "pricing",
  "cta",
  "footer",
];
const LANDING_FILL: readonly LibraryBlockType[] = ["cards", "text", "media", "form"];
const APP_PRIORITY: readonly LibraryBlockType[] = [
  "kpis",
  "chart",
  "table",
  "activity",
  "cards",
  "list",
  "calendar",
  "form",
  "settings",
  "empty",
];
const APP_FILL: readonly LibraryBlockType[] = ["text", "media", "container"];
const SHAPE_FILL: readonly LibraryBlockType[] = ["cards", "text", "media", "list", "form"];

/** Ready types; frame blocks only where they are blocks (navbar anywhere, sidebar only as an app frame). */
function allowed(type: LibraryBlockType, kind: ScreenKind, allowFrames: boolean): boolean {
  const def = blockDefOrFree(type);
  if (def.status !== "ready" || def.type !== type) return false;
  if (!def.frame) return true;
  if (!allowFrames) return false;
  return type === "navbar" || (type === "sidebar" && kind === "app");
}

function pick(
  groups: readonly (readonly LibraryBlockType[])[],
  kind: ScreenKind,
  allowFrames: boolean,
  exclude: ReadonlySet<LibraryBlockType> = new Set(),
): LibraryBlockType[] {
  const out: LibraryBlockType[] = [];
  const push = (type: LibraryBlockType) => {
    if (out.length < SUGGESTION_COUNT && !out.includes(type) && !exclude.has(type) && allowed(type, kind, allowFrames)) {
      out.push(type);
    }
  };
  for (const group of groups) for (const type of group) push(type);
  // Never fewer than five: the rest of the library in display order.
  for (const def of LIBRARY) if (def.type !== "free") push(def.type);
  return out;
}

function presentTypes(layout: LayoutDoc): Set<string> {
  return new Set(Object.values(layout.blocks).map((block) => block?.type));
}

/**
 * Five «Sugeridos» for the library: what the screen kind usually has and the layout does not have yet.
 * Never «soon» blocks; never frame blocks on app screens (navigation is the frame selector there).
 */
export function suggestBlocks(layout: LayoutDoc, kind: ScreenKind): LibraryBlockType[] {
  const present = presentTypes(layout);
  if (kind === "landing") {
    if (present.size === 0) return pick([LANDING_EMPTY], kind, true);
    return pick([LANDING_PRIORITY.filter((type) => !present.has(type)), LANDING_FILL], kind, true);
  }
  return pick([APP_PRIORITY.filter((type) => !present.has(type)), APP_FILL], kind, false);
}

export type ShapeSuggestOptions = {
  /** Id of the drawn block when it is already in the layout (left out of «the other blocks»). */
  id?: BlockId;
};

/**
 * Five suggestions for «¿Qué es esto?» after drawing a free rectangle, from its shape: a strip at the top
 * is a navbar, a tall box on an edge a sidebar (app), a wide box at the end a footer… Never «Bloque libre».
 */
export function suggestTypesForShape(
  rect: GridRect,
  layout: LayoutDoc,
  kind: ScreenKind,
  options: ShapeSuggestOptions = {},
): LibraryBlockType[] {
  const r = roundRect(rect);
  const others = Object.entries(layout.blocks).filter(
    ([id, block]) => block && id !== options.id && !(options.id === undefined && sameRect(roundRect(block.rect), r)),
  );
  const app = kind === "app";
  const early: LibraryBlockType[] = [];
  const late: LibraryBlockType[] = [];
  let matched = false;
  const add = (...types: LibraryBlockType[]) => {
    early.push(...types);
    matched = true;
  };

  if (r.h <= 10 && r.w >= 10 && r.row <= 2) add("navbar");
  if (r.w <= 3 && r.h >= 40 && (r.col === 0 || r.col + r.w === DESKTOP_COLUMNS) && app) add("sidebar");
  if (r.w >= 10 && r.row <= 12 && r.h >= 30) {
    if (app) {
      late.push("hero");
      matched = true;
    } else add("hero");
  }
  if (r.w >= 10 && others.length > 0) {
    const lowest = Math.max(...others.map(([, block]) => bottom(roundRect(block.rect))));
    if (r.row >= lowest) add("footer");
  }
  if (r.w >= 8 && r.h <= 16) add(...(app ? (["kpis"] as const) : (["logos", "cta"] as const)));
  if (r.w <= 4 && r.h >= 30) add("list", "activity");
  if (r.w >= 8 && r.h >= 40) add(...(app ? (["table", "calendar"] as const) : (["features"] as const)));
  if (!matched) add(...(app ? (["cards", "chart", "text", "media", "form"] as const) : (["cards", "text", "media", "form"] as const)));
  return pick([early, late, SHAPE_FILL], kind, true, new Set<LibraryBlockType>(["free"]));
}
