import {
  BASE_SPACE,
  COL_PX,
  CONTAINER_NAME,
  CONTAINER_QUERIES,
  DEFAULT_SCOPE,
  DESKTOP_COLUMNS,
  ROW_UNIT,
  TABLET_COLUMNS,
  TABLET_ONLY_QUERY,
} from "./constants";
import { areaName, inferStructure } from "./infer";
import { hiddenIds, prepare, type Item } from "./prepare";
import { deriveResponsive, mobileHeight, placementIn } from "./responsive";
import type {
  Breakpoint,
  BlockNode,
  GridNode,
  LayoutDoc,
  NodePlan,
  ResponsiveLayout,
  RowNode,
  ScreenKind,
  StackNode,
  Structure,
  StructureNode,
} from "./types";

export type CssOptions = {
  /** Root selector (the scope element). Default `.dl-layout`. */
  scope?: string;
  /** `landing`: heights are hints (aspect-ratio on media and charts). `app`: literal `min-height`. Default landing. */
  kind?: ScreenKind;
  /** Spacing scale in px used to quantize vertical gaps to `--dl-space-*`. Default `BASE_SPACE`. */
  space?: readonly number[];
  /** Selector of an element by id. Default `[data-dl-id="<id>"]`. */
  selector?: (id: string) => string;
  /** Container name. Default `dl-layout`. */
  container?: string;
  structure?: Structure;
  responsive?: ResponsiveLayout;
};

type GroupKind = "stack" | "row" | "grid";
type GroupChild = {
  el: El;
  start: number;
  span: number;
  /** Rows above the child inside a stack. */
  gapBefore: number;
  /** Rows between the top of a row and the child's top. */
  rowOffset: number;
  grid?: GridNode["items"][number];
};
type Group = {
  kind: GroupKind;
  /** Key of the plan in `responsive.<bp>.nodes`. */
  planKey: string;
  frameW: number;
  grid: GridNode | null;
  children: GroupChild[];
};
type El = {
  id: string;
  selector: string;
  node: StructureNode | null;
  item: Item | null;
  group: Group | null;
  parent: Group | null;
  index: number;
  overlay: boolean;
  tabletW: number;
  /** A lone root block narrower than the grid: placed with percentage margin and width. */
  lone: boolean;
};
type Props = Map<string, string>;
type Want = { props: Props; ignore: ReadonlySet<string>; hidden: boolean };

const PROP_ORDER = [
  "position",
  "container",
  "left",
  "top",
  "width",
  "display",
  "flex-direction",
  "grid-template-columns",
  "grid-template-rows",
  "grid-template-areas",
  "column-gap",
  "row-gap",
  "align-items",
  "grid-area",
  "grid-column",
  "grid-row",
  "order",
  "margin-block-start",
  "margin-inline-start",
  "justify-self",
  "aspect-ratio",
  "min-height",
] as const;

/** Value that undoes a property set at a wider breakpoint. */
const RESET: Readonly<Record<string, string>> = {
  display: "block",
  "flex-direction": "row",
  "grid-template-columns": "none",
  "grid-template-rows": "none",
  "grid-template-areas": "none",
  "column-gap": "normal",
  "row-gap": "normal",
  "align-items": "normal",
  "grid-area": "auto",
  "grid-column": "auto",
  "grid-row": "auto",
  order: "0",
  "margin-block-start": "0",
  "margin-inline-start": "0",
  width: "auto",
  "justify-self": "auto",
  "aspect-ratio": "auto",
  "min-height": "auto",
};

const NONE: ReadonlySet<string> = new Set();
/** Grid container properties mean nothing on a flex column. */
const FLEX_IGNORES: ReadonlySet<string> = new Set([
  "grid-template-columns",
  "grid-template-rows",
  "grid-template-areas",
  "column-gap",
]);
const GRID_IGNORES: ReadonlySet<string> = new Set(["flex-direction"]);
const ASPECT_TYPES: ReadonlySet<string> = new Set(["media", "chart"]);

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const fmt = (value: number) => String(Number(value.toFixed(4)));
const pct = (value: number) => `${fmt(value * 100)}%`;
const repeat = (n: number) => `repeat(${n}, minmax(0, 1fr))`;

/** A vertical gap in px as a theme space variable: nearest step (ties to the smaller); beyond the scale, a multiple of the last one. */
export function spaceVar(px: number, space: readonly number[] = BASE_SPACE): string | null {
  if (!(px > 0) || space.length === 0) return null;
  const last = space[space.length - 1]!;
  if (px > last) return `calc(var(--dl-space-${space.length}) * ${fmt(Math.round((px / last) * 4) / 4)})`;
  let best = 0;
  for (let i = 1; i < space.length; i++) {
    if (Math.abs(space[i]! - px) < Math.abs(space[best]! - px)) best = i;
  }
  return `var(--dl-space-${best + 1})`;
}

function cssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\n\r\f]/g, " ");
}

/**
 * CSS for a layout, following the DOM contract of `toElementTree`: one element per block and region with
 * `data-dl-id`, overlays as direct children of the scope element. Desktop is a 12-column grid per region;
 * tablet and mobile use container queries. Uses only `--dl-space-*` variables. Deterministic output.
 */
export function toCss(layout: LayoutDoc, options: CssOptions = {}): string {
  const scope = options.scope ?? DEFAULT_SCOPE;
  const kind: ScreenKind = options.kind ?? "landing";
  const space = options.space ?? BASE_SPACE;
  const selectorOf = options.selector ?? ((id: string) => `[data-dl-id="${cssString(id)}"]`);
  const containerName = options.container ?? CONTAINER_NAME;
  const structure = options.structure ?? inferStructure(layout);
  const responsive = options.responsive ?? deriveResponsive(layout, structure);
  const prepared = prepare(layout);
  const { items } = prepared;
  const hiddenOnDesktop = hiddenIds(prepared, (item) => item.block.hidden === true);

  // ---- Element tree with the group each element owns and the one that places it. ----
  const elements: El[] = [];
  const makeEl = (node: StructureNode | null, overlay: boolean): El => {
    const el: El = {
      id: node ? node.id : "",
      selector: node ? `${scope} ${selectorOf(node.id)}` : scope,
      node,
      item: node && node.kind === "block" ? (items.get(node.id) ?? null) : null,
      group: null,
      parent: null,
      index: 0,
      overlay,
      tabletW: TABLET_COLUMNS,
      lone: false,
    };
    elements.push(el);
    return el;
  };

  const attach = (owner: El, group: Group) => {
    owner.group = group;
    group.children.forEach((child, index) => {
      child.el.parent = group;
      child.el.index = index;
    });
  };

  const regionGroup = (node: StackNode | RowNode | GridNode, planKey: string): Group => {
    switch (node.kind) {
      case "stack":
        return {
          kind: "stack",
          planKey,
          frameW: node.frame.w,
          grid: null,
          children: node.children.map((c, i) => ({
            el: build(c.node),
            start: c.start,
            span: c.span,
            gapBefore: i === 0 ? 0 : (node.gaps[i - 1] ?? 0),
            rowOffset: 0,
          })),
        };
      case "row":
        return {
          kind: "row",
          planKey,
          frameW: node.frame.w,
          grid: null,
          children: node.children.map((c) => ({
            el: build(c.node),
            start: c.start,
            span: c.span,
            gapBefore: 0,
            rowOffset: Math.max(0, c.node.rect.row - node.rect.row),
          })),
        };
      case "grid":
        return {
          kind: "grid",
          planKey,
          frameW: node.frame.w,
          grid: node,
          children: node.items.map((item) => ({
            el: build(item.node),
            start: 0,
            span: 0,
            gapBefore: 0,
            rowOffset: 0,
            grid: item,
          })),
        };
    }
  };

  function build(node: StructureNode, overlay = false): El {
    const el = makeEl(node, overlay);
    if (node.kind === "block") {
      const content = node.content;
      if (content?.kind === "block") {
        attach(el, {
          kind: "stack",
          planKey: node.id,
          frameW: node.frame.w,
          grid: null,
          children: [{ el: build(content), ...placementIn(content, node), gapBefore: 0, rowOffset: 0 }],
        });
      } else if (content) {
        attach(el, regionGroup(content, node.id));
      }
    } else {
      attach(el, regionGroup(node, node.id));
    }
    return el;
  }

  makeEl(null, false); // The scope element.
  const root = structure.root;
  let rootEl: El | null = null;
  if (root) {
    rootEl = build(root);
    if (root.kind === "block") {
      const placement = placementIn(root, null);
      rootEl.lone = placement.start !== 0 || placement.span !== DESKTOP_COLUMNS;
    }
  }
  for (const overlay of structure.overlays) build(overlay, true);

  // ---- Plans and visibility per breakpoint. ----
  const planOf = (group: Group, bp: Breakpoint): NodePlan | "desktop" | null => {
    if (bp === "desktop") return "desktop";
    return responsive[bp].nodes[group.planKey] ?? null;
  };

  const visibleMemo = new Map<string, boolean>();
  const isVisible = (el: El, bp: Breakpoint): boolean => {
    if (!el.node) return true;
    const key = `${bp}:${el.id}`;
    const known = visibleMemo.get(key);
    if (known !== undefined) return known;
    let value: boolean;
    if (el.node.kind === "block") {
      value =
        bp === "desktop" ? !hiddenOnDesktop.has(el.id) : responsive[bp].blocks[el.id]?.hidden === false;
    } else {
      value = (el.group?.children ?? []).some((child) => isVisible(child.el, bp));
    }
    visibleMemo.set(key, value);
    return value;
  };

  // Tablet widths of every element, top-down from the plans.
  const assignTablet = (el: El, width: number) => {
    const own = el.node?.kind === "block" ? responsive.tablet.blocks[el.id]?.rect?.w : undefined;
    el.tabletW = own ?? width;
    const group = el.group;
    if (!group) return;
    const plan = planOf(group, "tablet");
    group.children.forEach((child, i) => {
      const w = plan && plan !== "desktop" && plan.mode !== "stack" ? plan.spans[i] || el.tabletW : el.tabletW;
      assignTablet(child.el, w);
    });
  };
  // The root element is not a child of the scope element's group (the scope has none): start from it.
  if (rootEl) assignTablet(rootEl, TABLET_COLUMNS);
  for (const el of elements) {
    if (el.overlay) assignTablet(el, responsive.tablet.blocks[el.id]?.rect?.w ?? TABLET_COLUMNS);
  }

  // ---- Desired properties of an element at a breakpoint. ----
  const containerProps = (el: El, group: Group, bp: Breakpoint, props: Props): ReadonlySet<string> => {
    const plan = planOf(group, bp);
    const width = bp === "tablet" ? el.tabletW : group.frameW;
    if (plan === "desktop") {
      if (group.kind === "stack") {
        const allFull = group.children.every((c) => c.start === 0 && c.span === group.frameW);
        if (allFull) {
          props.set("display", "flex");
          props.set("flex-direction", "column");
          return FLEX_IGNORES;
        }
      }
      props.set("display", "grid");
      if (group.kind === "grid" && group.grid) {
        props.set("grid-template-columns", group.grid.columns.map((n) => `minmax(0, ${n}fr)`).join(" "));
        props.set("grid-template-rows", group.grid.rows.map((n) => `minmax(calc(${n} * ${ROW_UNIT}px), auto)`).join(" "));
        if (group.grid.areas) props.set("grid-template-areas", group.grid.areas.map((line) => `"${line}"`).join("\n"));
      } else {
        props.set("grid-template-columns", repeat(group.frameW));
      }
      props.set("column-gap", "var(--dl-space-5)");
      if (group.kind === "row") props.set("align-items", kind === "app" ? "start" : "stretch");
      return GRID_IGNORES;
    }
    if (!plan || plan.mode === "stack") {
      props.set("display", "flex");
      props.set("flex-direction", "column");
      if (group.kind !== "stack") props.set("row-gap", "var(--dl-space-5)");
      return FLEX_IGNORES;
    }
    props.set("display", "grid");
    props.set("grid-template-columns", repeat(width));
    if (group.kind === "grid" && group.grid) {
      props.set("grid-template-rows", group.grid.rows.map((n) => `minmax(calc(${n} * ${ROW_UNIT}px), auto)`).join(" "));
    }
    props.set("column-gap", "var(--dl-space-5)");
    if (plan.mode === "wrap") props.set("row-gap", "var(--dl-space-5)");
    if (group.kind === "row") props.set("align-items", kind === "app" ? "start" : "stretch");
    return GRID_IGNORES;
  };

  const placementProps = (el: El, group: Group, bp: Breakpoint, props: Props) => {
    const child = group.children[el.index]!;
    const plan = planOf(group, bp);
    const margin = (rows: number) => {
      const value = spaceVar(rows * ROW_UNIT, space);
      if (value) props.set("margin-block-start", value);
    };
    if (plan === "desktop") {
      if (group.kind === "stack") {
        const allFull = group.children.every((c) => c.start === 0 && c.span === group.frameW);
        if (!allFull) {
          props.set("grid-column", `${child.start + 1} / span ${child.span}`);
          props.set("grid-row", String(el.index + 1));
        }
        margin(child.gapBefore);
      } else if (group.kind === "row") {
        props.set("grid-column", `${child.start + 1} / span ${child.span}`);
        props.set("grid-row", "1");
        margin(child.rowOffset);
      } else if (child.grid) {
        if (group.grid?.areas) props.set("grid-area", areaName(el.id));
        else {
          props.set("grid-column", `${child.grid.colStart} / ${child.grid.colEnd}`);
          props.set("grid-row", `${child.grid.rowStart} / ${child.grid.rowEnd}`);
        }
      }
      return;
    }
    if (!plan || plan.mode === "stack") {
      if (group.kind === "stack") margin(child.gapBefore);
      return;
    }
    if (plan.mode === "wrap") {
      props.set("grid-column", `span ${plan.spans[el.index] ?? 1}`);
      props.set("grid-row", "auto");
      return;
    }
    const start = plan.starts[el.index] ?? 0;
    const span = plan.spans[el.index] ?? 1;
    props.set("grid-column", `${start + 1} / span ${span}`);
    if (group.kind === "stack") {
      props.set("grid-row", String(el.index + 1));
      margin(child.gapBefore);
    } else if (group.kind === "row") {
      props.set("grid-row", "1");
      margin(child.rowOffset);
    } else if (child.grid) {
      props.set("grid-row", `${child.grid.rowStart} / ${child.grid.rowEnd}`);
    }
  };

  const blockProps = (el: El, bp: Breakpoint, props: Props) => {
    const node = el.node as BlockNode;
    const item = el.item;
    if (!item) return;
    if (kind === "landing" && ASPECT_TYPES.has(item.def.type)) {
      const a = node.rect.w * COL_PX;
      const b = node.rect.h * ROW_UNIT;
      const g = gcd(a, b);
      props.set("aspect-ratio", `${a / g} / ${b / g}`);
      // The ratio is a hint for the height, never for the width. A landing row stretches its items to the
      // tallest one; with `justify-self: normal` a stretched item with a ratio takes its width from that
      // height and spills out of its columns (and out of the page). `stretch` keeps it in its span: the
      // ratio then only sets the minimum height. Ignored where the parent is a flex column.
      if (el.parent) props.set("justify-self", "stretch");
    }
    if (kind === "app") {
      // Literal height, also for blocks with children (a container or a modal keeps its drawn height). On
      // mobile, a leaf takes its derived height; a block with content, its own height by behavior (the
      // derived one also counts its children, which already take their room).
      const derived = responsive.mobile.blocks[el.id];
      const h =
        bp !== "mobile"
          ? node.rect.h
          : node.content
            ? mobileHeight(item, derived?.behavior ?? item.def.mobile)
            : (derived?.rect?.h ?? node.rect.h);
      props.set("min-height", `${h * ROW_UNIT}px`);
    }
    if (bp === "mobile" && responsive.mobile.blocks[el.id]?.behavior === "tabbar") props.set("order", "1");
    if (el.lone && bp !== "mobile") {
      // The scope element cannot answer its own container queries, so a lone narrow block is placed with
      // percentages instead of a grid on the scope.
      const columns = bp === "desktop" ? DESKTOP_COLUMNS : TABLET_COLUMNS;
      const rect = bp === "desktop" ? node.rect : responsive.tablet.blocks[el.id]?.rect;
      if (rect && rect.col > 0) props.set("margin-inline-start", pct(rect.col / columns));
      if (rect && rect.w < columns) props.set("width", pct(rect.w / columns));
    }
    if (el.overlay) {
      props.set("position", "absolute");
      if (bp === "desktop") {
        props.set("left", pct(node.rect.col / DESKTOP_COLUMNS));
        props.set("top", `${node.rect.row * ROW_UNIT}px`);
        props.set("width", pct(node.rect.w / DESKTOP_COLUMNS));
      } else {
        const rect = responsive[bp].blocks[el.id]?.rect;
        const row = rect ? rect.row : node.rect.row;
        if (bp === "mobile") {
          props.set("left", "0");
          props.set("width", "100%");
        } else if (rect) {
          props.set("left", pct(rect.col / TABLET_COLUMNS));
          props.set("width", pct(rect.w / TABLET_COLUMNS));
        }
        props.set("top", `${row * ROW_UNIT}px`);
      }
    }
  };

  const want = (el: El, bp: Breakpoint): Want => {
    const props: Props = new Map();
    if (!isVisible(el, bp)) {
      props.set("display", "none");
      return { props, ignore: NONE, hidden: true };
    }
    let ignore: ReadonlySet<string> = NONE;
    if (!el.node) {
      props.set("position", "relative");
      props.set("container", `${containerName} / inline-size`);
    }
    if (el.group) ignore = containerProps(el, el.group, bp, props);
    if (el.parent) placementProps(el, el.parent, bp, props);
    if (el.node?.kind === "block") blockProps(el, bp, props);
    return { props, ignore, hidden: false };
  };

  // ---- Cascade: desktop, then only what changes at tablet and at mobile (tablet also matches mobile). ----
  const effective = new Map<El, Props>();
  const desktopRules: [El, Props][] = [];
  const tabletRules: [El, Props][] = [];
  const tabletOnlyRules: [El, Props][] = [];
  const mobileRules: [El, Props][] = [];

  for (const el of elements) {
    const w = want(el, "desktop");
    effective.set(el, new Map(w.props));
    if (w.props.size > 0) desktopRules.push([el, w.props]);
  }

  const diff = (prev: Props, w: Want): Props => {
    const out: Props = new Map();
    for (const [prop, value] of w.props) if (prev.get(prop) !== value) out.set(prop, value);
    if (!w.hidden) {
      for (const [prop, value] of prev) {
        if (w.props.has(prop) || w.ignore.has(prop)) continue;
        const reset = RESET[prop];
        if (reset !== undefined && value !== reset) out.set(prop, reset);
      }
    }
    return out;
  };

  for (const el of elements) {
    const w = want(el, "tablet");
    const prev = effective.get(el)!;
    if (w.hidden && el.group === null && el.node && isVisible(el, "mobile") && prev.get("display") !== "none") {
      // A leaf hidden only on tablet: mobile could not undo `display: none`, so it gets its own range.
      tabletOnlyRules.push([el, new Map([["display", "none"]])]);
      continue;
    }
    const out = diff(prev, w);
    for (const [prop, value] of out) prev.set(prop, value);
    if (out.size > 0) tabletRules.push([el, out]);
  }
  for (const el of elements) {
    const w = want(el, "mobile");
    const out = diff(effective.get(el)!, w);
    if (out.size > 0) mobileRules.push([el, out]);
  }

  const order = new Map(elements.map((el, i) => [el, i]));
  const byElement = (a: [El, Props], b: [El, Props]) => order.get(a[0])! - order.get(b[0])!;
  const sections = [desktopRules.sort(byElement).map(([el, props]) => formatRule(el.selector, props, ""))];
  const block = (query: string, rules: [El, Props][]) => {
    if (rules.length === 0) return;
    const body = rules
      .sort(byElement)
      .map(([el, props]) => formatRule(el.selector, props, "  "))
      .join("\n\n");
    sections.push([`@container ${containerName} ${query} {\n${body}\n}`]);
  };
  block(CONTAINER_QUERIES.tablet, tabletRules);
  block(TABLET_ONLY_QUERY, tabletOnlyRules);
  block(CONTAINER_QUERIES.mobile, mobileRules);
  return `${sections.map((rules) => rules.join("\n\n")).join("\n\n")}\n`;
}

function formatRule(selector: string, props: Props, indent: string): string {
  const lines = [`${indent}${selector} {`];
  for (const prop of PROP_ORDER) {
    const value = props.get(prop);
    if (value === undefined) continue;
    if (prop === "grid-template-areas" && value.includes("\n")) {
      const rows = value.split("\n");
      lines.push(`${indent}  ${prop}:`);
      rows.forEach((row, i) => lines.push(`${indent}    ${row}${i === rows.length - 1 ? ";" : ""}`));
    } else {
      lines.push(`${indent}  ${prop}: ${value};`);
    }
  }
  lines.push(`${indent}}`);
  return lines.join("\n");
}
