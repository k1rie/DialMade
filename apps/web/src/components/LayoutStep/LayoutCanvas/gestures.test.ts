import type { Adjustment, GridRect, LayoutBlock, LayoutDoc, LayoutWarning } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import type { GridMetrics } from "../../../lib/geometry/grid";
import { HANDLES } from "../../../lib/geometry/rect";
import { HEADER_STRIP_PX, NAV_FRAME_PX } from "../constants";
import { FRAME_GUTTER_PX, FRAME_MIN_ROWS, FRAME_PAD_ROWS, MIN_BLOCK_SIZE, Z_ACTIVE, Z_BADGE, Z_OVERLAY } from "./constants";
import {
  adjustedIds,
  askingStillValid,
  blockBox,
  bottomRow,
  containerFor,
  defaultSizeOf,
  derivedLayoutFor,
  drawGesture,
  dropRect,
  edgeScrollStep,
  focusAfterChange,
  frameGeometry,
  frameHeightPx,
  frameRows,
  fromGridUnits,
  keyboardGrabStep,
  layoutKeyOf,
  layoutSpringFor,
  MIN_FRAME_WIDTH,
  moveGesture,
  navForDevice,
  nearestSurvivor,
  panScroll,
  pastThreshold,
  promoteToMove,
  rectKey,
  relativePoint,
  resizeGesture,
  revealScrollTop,
  sameRect,
  scrollAfterDeviceSwitch,
  stackingOrder,
  toGridUnits,
  warningsByBlock,
  withDescendants,
  type KeyboardGrab,
} from "./gestures";

const rect = (col: number, row: number, w: number, h: number): GridRect => ({ col, row, w, h });
/** 12 columns of 100 px and rows of 8 px (k = 1). */
const M: GridMetrics = { colPx: 100, rowPx: 8, columns: 12 };

function layoutOf(blocks: Record<string, Partial<LayoutBlock> & Pick<LayoutBlock, "type" | "rect">>): LayoutDoc {
  const out: Record<string, LayoutBlock> = {};
  let z = 1;
  for (const [id, block] of Object.entries(blocks)) out[id] = { label: id, z: z++, ...block };
  return { version: 1, columns: 12, rowUnit: 8, blocks: out };
}

function expectValid(r: GridRect, columns = 12) {
  for (const value of [r.col, r.row, r.w, r.h]) expect(Number.isInteger(value)).toBe(true);
  expect(r.col).toBeGreaterThanOrEqual(0);
  expect(r.row).toBeGreaterThanOrEqual(0);
  expect(r.w).toBeGreaterThanOrEqual(1);
  expect(r.h).toBeGreaterThanOrEqual(1);
  expect(r.col + r.w).toBeLessThanOrEqual(columns);
}

describe("navForDevice", () => {
  it("keeps the navigation on desktop", () => {
    for (const nav of ["sidebar", "rail", "topnav", "none"] as const) expect(navForDevice(nav, "desktop")).toBe(nav);
  });

  it("folds a sidebar into a rail on tablet", () => {
    expect(navForDevice("sidebar", "tablet")).toBe("rail");
    expect(navForDevice("rail", "tablet")).toBe("rail");
    expect(navForDevice("topnav", "tablet")).toBe("topnav");
  });

  it("turns any navigation into a top bar on mobile, and keeps none", () => {
    expect(navForDevice("sidebar", "mobile")).toBe("topnav");
    expect(navForDevice("rail", "mobile")).toBe("topnav");
    expect(navForDevice("topnav", "mobile")).toBe("topnav");
    expect(navForDevice("none", "mobile")).toBe("none");
    expect(navForDevice("none", "tablet")).toBe("none");
  });
});

describe("frameGeometry", () => {
  it("fits the device width into the available width without scaling anything", () => {
    const g = frameGeometry(1000 + 2 * FRAME_GUTTER_PX, "desktop", null);
    expect(g.frameWidth).toBe(1000);
    expect(g.k).toBeCloseTo(1000 / 1440);
    expect(g.content).toEqual({ left: 0, top: 0, width: 1000 });
    expect(g.metrics.columns).toBe(12);
    expect(g.metrics.colPx).toBeCloseTo(1000 / 12);
    expect(g.metrics.rowPx).toBeCloseTo(8 * (1000 / 1440));
    expect(g.nav).toBeNull();
    expect(g.header).toBeNull();
  });

  it("never draws the frame wider than the device", () => {
    const g = frameGeometry(5000, "tablet", null);
    expect(g.frameWidth).toBe(768);
    expect(g.k).toBe(1);
    expect(g.metrics).toEqual({ colPx: 96, rowPx: 8, columns: 8 });
    expect(frameGeometry(5000, "mobile", null).metrics).toEqual({ colPx: 97.5, rowPx: 8, columns: 4 });
  });

  it("keeps a minimum frame width when the column is narrow or not measured yet", () => {
    expect(frameGeometry(0, "desktop", null).frameWidth).toBe(MIN_FRAME_WIDTH);
    expect(frameGeometry(Number.NaN, "desktop", null).frameWidth).toBe(MIN_FRAME_WIDTH);
    expect(frameGeometry(100, "mobile", null).frameWidth).toBe(MIN_FRAME_WIDTH);
  });

  it("puts the content right of a sidebar and below the header strip", () => {
    const g = frameGeometry(1440 + 2 * FRAME_GUTTER_PX, "desktop", { nav: "sidebar", header: true });
    expect(g.nav).toEqual({ nav: "sidebar", side: "left", size: NAV_FRAME_PX.sidebar });
    expect(g.header).toEqual({ left: NAV_FRAME_PX.sidebar, top: 0, height: HEADER_STRIP_PX });
    expect(g.content).toEqual({ left: NAV_FRAME_PX.sidebar, top: HEADER_STRIP_PX, width: 1440 - NAV_FRAME_PX.sidebar });
    expect(g.metrics.colPx).toBeCloseTo((1440 - NAV_FRAME_PX.sidebar) / 12);
  });

  it("scales the chrome with the frame", () => {
    const g = frameGeometry(720 + 2 * FRAME_GUTTER_PX, "desktop", { nav: "rail", header: true });
    expect(g.k).toBe(0.5);
    expect(g.nav?.size).toBe(NAV_FRAME_PX.rail / 2);
    expect(g.header?.height).toBe(HEADER_STRIP_PX / 2);
    expect(g.content.width).toBe(720 - NAV_FRAME_PX.rail / 2);
  });

  it("puts a top navigation above the header strip", () => {
    const g = frameGeometry(1440 + 2 * FRAME_GUTTER_PX, "desktop", { nav: "topnav", header: true });
    expect(g.nav).toEqual({ nav: "topnav", side: "top", size: NAV_FRAME_PX.topnav });
    expect(g.header).toEqual({ left: 0, top: NAV_FRAME_PX.topnav, height: HEADER_STRIP_PX });
    expect(g.content).toEqual({ left: 0, top: NAV_FRAME_PX.topnav + HEADER_STRIP_PX, width: 1440 });
  });

  it("draws nothing for an app screen without navigation or header", () => {
    const g = frameGeometry(1440 + 2 * FRAME_GUTTER_PX, "desktop", { nav: "none", header: false });
    expect(g.nav).toBeNull();
    expect(g.header).toBeNull();
    expect(g.content).toEqual({ left: 0, top: 0, width: 1440 });
  });

  it("uses the device's navigation on derived views", () => {
    expect(frameGeometry(2000, "tablet", { nav: "sidebar", header: false }).nav?.nav).toBe("rail");
    const mobile = frameGeometry(2000, "mobile", { nav: "sidebar", header: false });
    expect(mobile.nav).toEqual({ nav: "topnav", side: "top", size: NAV_FRAME_PX.topnav });
    expect(mobile.content.width).toBe(390);
  });
});

describe("frameRows / frameHeightPx / bottomRow", () => {
  it("keeps at least the minimum, then pads below the lowest block", () => {
    expect(frameRows(0)).toBe(FRAME_MIN_ROWS);
    expect(frameRows(FRAME_MIN_ROWS - FRAME_PAD_ROWS)).toBe(FRAME_MIN_ROWS);
    expect(frameRows(200)).toBe(200 + FRAME_PAD_ROWS);
  });

  it("adds the extra rows of «+ Añadir espacio», ignoring nonsense", () => {
    expect(frameRows(0, 40)).toBe(FRAME_MIN_ROWS + 40);
    expect(frameRows(0, -5)).toBe(FRAME_MIN_ROWS);
    expect(frameRows(Number.NaN, Number.NaN)).toBe(FRAME_MIN_ROWS);
  });

  it("measures the frame below the chrome", () => {
    const g = frameGeometry(1440 + 2 * FRAME_GUTTER_PX, "desktop", { nav: "topnav", header: true });
    expect(frameHeightPx(g, 100)).toBe(NAV_FRAME_PX.topnav + HEADER_STRIP_PX + 800);
  });

  it("finds the lowest edge, skipping hidden blocks", () => {
    expect(bottomRow([])).toBe(0);
    expect(bottomRow([rect(0, 0, 4, 10), null, rect(2, 30, 2, 5), undefined])).toBe(35);
  });
});

describe("blockBox", () => {
  it("converts to screen px with an inset on every side", () => {
    expect(blockBox(rect(2, 3, 4, 10), M)).toEqual({ left: 202, top: 26, width: 396, height: 76 });
    expect(blockBox(rect(0, 0, 1, 1), M, 0)).toEqual({ left: 0, top: 0, width: 100, height: 8 });
  });

  it("never returns a negative size", () => {
    expect(blockBox(rect(0, 0, 1, 1), { colPx: 1, rowPx: 1, columns: 12 }, 4)).toMatchObject({ width: 0, height: 0 });
  });
});

describe("pointer helpers", () => {
  it("measures points relative to an element", () => {
    expect(relativePoint({ x: 150, y: 90 }, { left: 100, top: 40 })).toEqual({ x: 50, y: 50 });
  });

  it("starts a drag after 3 px of travel", () => {
    expect(pastThreshold({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(false);
    expect(pastThreshold({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(true);
    expect(pastThreshold({ x: 10, y: 10 }, { x: 8, y: 7.5 })).toBe(true);
    expect(pastThreshold({ x: 0, y: 0 }, { x: 5, y: 0 }, 6)).toBe(false);
  });

  it("moves by whole cells from where the pointer was pressed", () => {
    const start = rect(2, 10, 4, 6);
    expect(moveGesture(start, { x: 500, y: 100 }, { x: 651, y: 124 }, M)).toEqual(rect(4, 13, 4, 6));
    expect(moveGesture(start, { x: 500, y: 100 }, { x: 540, y: 102 }, M)).toEqual(start);
    expect(moveGesture(start, { x: 0, y: 0 }, { x: -5000, y: -5000 }, M)).toEqual(rect(0, 0, 4, 6));
  });

  it("resizes from every handle and keeps the minimum size", () => {
    const start = rect(4, 10, 4, 10);
    for (const handle of HANDLES) {
      const shrunk = resizeGesture(start, handle, { x: 0, y: 0 }, { x: handle.includes("w") ? 9000 : -9000, y: handle.includes("n") ? 9000 : -9000 }, M);
      expectValid(shrunk);
      if (handle.includes("e") || handle.includes("w")) expect(shrunk.w).toBe(MIN_BLOCK_SIZE.w);
      if (handle.includes("n") || handle.includes("s")) expect(shrunk.h).toBe(MIN_BLOCK_SIZE.h);
    }
    expect(resizeGesture(start, "se", { x: 10, y: 10 }, { x: 210, y: 34 }, M)).toEqual(rect(4, 10, 6, 13));
  });

  it("draws from anchor to pointer in any direction", () => {
    const forward = drawGesture({ x: 150, y: 20 }, { x: 420, y: 100 }, M);
    expect(forward).toEqual(rect(1, 2, 4, 11));
    expect(drawGesture({ x: 420, y: 100 }, { x: 150, y: 20 }, M)).toEqual(forward);
  });

  it("grows a click-sized drawing to the minimum block", () => {
    expect(drawGesture({ x: 250, y: 40 }, { x: 250, y: 40 }, M)).toEqual(rect(2, 5, MIN_BLOCK_SIZE.w, MIN_BLOCK_SIZE.h));
  });

  it("pans opposite to the drag and never past the start of the scroller", () => {
    expect(panScroll({ left: 100, top: 300 }, { x: 50, y: 50 }, { x: 80, y: 10 })).toEqual({ left: 70, top: 340 });
    expect(panScroll({ left: 10, top: 10 }, { x: 0, y: 0 }, { x: 500, y: 500 })).toEqual({ left: 0, top: 0 });
  });

  it("round-trips grid units through a different frame size", () => {
    const units = toGridUnits({ x: 250, y: 40 }, M);
    expect(units).toEqual({ x: 2.5, y: 5 });
    expect(fromGridUnits(units, { colPx: 50, rowPx: 4, columns: 12 })).toEqual({ x: 125, y: 20 });
    expect(toGridUnits({ x: 10, y: 10 }, { colPx: 0, rowPx: 0, columns: 12 })).toEqual({ x: 0, y: 0 });
  });
});

describe("edgeScrollStep", () => {
  const viewport = { top: 100, bottom: 600 };

  it("does nothing away from the edges", () => {
    expect(edgeScrollStep(350, viewport)).toBe(0);
    expect(edgeScrollStep(100 + 48, viewport)).toBe(0);
    expect(edgeScrollStep(600 - 48, viewport)).toBe(0);
  });

  it("scrolls up near the top and down near the bottom, faster closer to the edge", () => {
    expect(edgeScrollStep(130, viewport)).toBeLessThan(0);
    expect(edgeScrollStep(105, viewport)).toBeLessThan(edgeScrollStep(130, viewport));
    expect(edgeScrollStep(580, viewport)).toBeGreaterThan(0);
    expect(edgeScrollStep(598, viewport)).toBeGreaterThan(edgeScrollStep(580, viewport));
  });

  it("caps the speed past the edge", () => {
    expect(edgeScrollStep(-500, viewport)).toBe(-18);
    expect(edgeScrollStep(5000, viewport)).toBe(18);
    expect(edgeScrollStep(-500, viewport, 48, 10)).toBe(-10);
  });

  it("stays still in a viewport too short for two edge bands, or for a bad pointer", () => {
    expect(edgeScrollStep(105, { top: 100, bottom: 180 })).toBe(0);
    expect(edgeScrollStep(Number.NaN, viewport)).toBe(0);
  });
});

describe("dropRect", () => {
  it("centres the default size on the pointer, snapped to the grid", () => {
    expect(dropRect({ x: 600, y: 200 }, { w: 4, h: 10 }, M)).toEqual(rect(4, 20, 4, 10));
    expect(dropRect({ x: 649, y: 203 }, { w: 3, h: 7 }, M)).toEqual(rect(5, 22, 3, 7));
  });

  it("keeps the block inside the columns and below row 0", () => {
    expect(dropRect({ x: 10, y: 4 }, { w: 6, h: 20 }, M)).toEqual(rect(0, 0, 6, 20));
    expect(dropRect({ x: 1190, y: 8000 }, { w: 6, h: 20 }, M)).toEqual(rect(6, 990, 6, 20));
  });

  it("narrows a block wider than the frame", () => {
    expect(dropRect({ x: 100, y: 100 }, { w: 12, h: 10 }, { colPx: 90, rowPx: 8, columns: 4 })).toEqual(rect(0, 8, 4, 10));
  });

  it("survives an unmeasured frame and nonsense sizes", () => {
    const r = dropRect({ x: Number.NaN, y: 50 }, { w: 0, h: -3 }, { colPx: 0, rowPx: 0, columns: 12 });
    expectValid(r);
  });

  it("knows the default size of every type, and of unknown ones", () => {
    expect(defaultSizeOf("calendar").w).toBeGreaterThan(0);
    expect(defaultSizeOf("not-a-block")).toEqual(defaultSizeOf("free"));
  });
});

describe("containerFor", () => {
  const layout = layoutOf({
    page: { type: "container", rect: rect(0, 0, 12, 100) },
    box: { type: "container", rect: rect(0, 10, 6, 40) },
    hero: { type: "hero", rect: rect(6, 10, 6, 40) },
  });

  it("finds the smallest container holding ≥90 % of the rect", () => {
    expect(containerFor(layout, rect(1, 12, 4, 10))).toBe("box");
    expect(containerFor(layout, rect(7, 12, 4, 10))).toBe("page");
  });

  it("ignores containers that hold less than 90 %", () => {
    expect(containerFor(layout, rect(4, 12, 4, 10))).toBe("page");
    expect(containerFor(layout, rect(0, 95, 4, 10))).toBeNull();
  });

  it("never nests into blocks that are not containers", () => {
    const onlyHero = layoutOf({ hero: { type: "hero", rect: rect(0, 0, 12, 40) } });
    expect(containerFor(onlyHero, rect(2, 2, 4, 4))).toBeNull();
  });

  it("skips excluded blocks (the moving block and its descendants)", () => {
    expect(containerFor(layout, rect(1, 12, 4, 10), new Set(["box"]))).toBe("page");
    expect(containerFor(layout, rect(1, 12, 4, 10), new Set(["box", "page"]))).toBeNull();
  });
});

describe("withDescendants / stackingOrder", () => {
  const layout = layoutOf({
    root: { type: "container", rect: rect(0, 0, 12, 50) },
    child: { type: "container", rect: rect(0, 0, 6, 20), parentId: "root" },
    grandchild: { type: "text", rect: rect(0, 0, 3, 5), parentId: "child" },
    loose: { type: "text", rect: rect(0, 60, 3, 5) },
    orphan: { type: "text", rect: rect(0, 70, 3, 5), parentId: "gone" },
    a: { type: "container", rect: rect(0, 80, 3, 5), parentId: "b" },
    b: { type: "container", rect: rect(0, 80, 3, 5), parentId: "a" },
  });

  it("collects a block with every descendant", () => {
    expect(withDescendants(layout, "root")).toEqual(new Set(["root", "child", "grandchild"]));
    expect(withDescendants(layout, "loose")).toEqual(new Set(["loose"]));
  });

  it("survives cycles", () => {
    expect(withDescendants(layout, "a")).toEqual(new Set(["a", "b"]));
  });

  it("numbers every block 1…N, cycles and missing parents included", () => {
    const order = stackingOrder(layout);
    expect(order.size).toBe(Object.keys(layout.blocks).length);
    expect([...order.values()].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("stacks children above their parents whatever their z", () => {
    const deep = layoutOf({
      parent: { type: "container", rect: rect(0, 0, 12, 50), z: 900 },
      kid: { type: "text", rect: rect(0, 0, 3, 5), parentId: "parent", z: 0 },
      grandkid: { type: "text", rect: rect(0, 0, 1, 2), parentId: "kid", z: -4 },
    });
    const order = stackingOrder(deep);
    expect(order.get("kid")!).toBeGreaterThan(order.get("parent")!);
    expect(order.get("grandkid")!).toBeGreaterThan(order.get("kid")!);
  });

  it("puts a later root block above every descendant of an earlier container (finding 44)", () => {
    // A Contenedor with Tarjetas inside, and a Modal that stays at the root over part of them.
    const overlapped = layoutOf({
      box: { type: "container", rect: rect(0, 0, 12, 60), z: 1 },
      cards: { type: "cards", rect: rect(0, 0, 12, 20), parentId: "box", z: 2 },
      modal: { type: "modal", rect: rect(2, 10, 6, 30), z: 3 },
    });
    const order = stackingOrder(overlapped);
    expect(order.get("modal")!).toBeGreaterThan(order.get("cards")!);
    expect(order.get("cards")!).toBeGreaterThan(order.get("box")!);
  });

  it("keeps each subtree a contiguous band, ordered among siblings by z", () => {
    const bands = layoutOf({
      high: { type: "container", rect: rect(0, 0, 6, 20), z: 5 },
      highKid: { type: "text", rect: rect(0, 0, 3, 5), parentId: "high", z: 1 },
      low: { type: "container", rect: rect(6, 0, 6, 20), z: 2 },
      lowKid: { type: "text", rect: rect(6, 0, 3, 5), parentId: "low", z: 9 },
      lowKid2: { type: "text", rect: rect(9, 0, 3, 5), parentId: "low", z: 3 },
    });
    const order = stackingOrder(bands);
    expect(order.get("low")).toBe(1);
    expect(order.get("lowKid2")).toBe(2);
    expect(order.get("lowKid")).toBe(3);
    expect(order.get("high")).toBe(4);
    expect(order.get("highKid")).toBe(5);
  });

  it("breaks ties in z by reading order, then by id", () => {
    const tie = layoutOf({
      x: { type: "text", rect: rect(0, 0, 3, 5), z: 1 },
      y: { type: "text", rect: rect(3, 0, 3, 5), z: 1 },
    });
    expect(stackingOrder(tie, ["y", "x"]).get("y")).toBe(1);
    expect(stackingOrder(tie).get("x")).toBe(1);
  });

  it("does not depend on the order of the blocks in the record", () => {
    const reversed: LayoutDoc = { ...layout, blocks: Object.fromEntries(Object.entries(layout.blocks).reverse()) };
    expect(stackingOrder(reversed)).toEqual(stackingOrder(layout));
  });

  it("stays far below the lifted and overlay layers", () => {
    const many = layoutOf(Object.fromEntries(Array.from({ length: 300 }, (_, index) => [`b${index}`, { type: "text" as const, rect: rect(0, index, 1, 1) }])));
    expect(Math.max(...stackingOrder(many).values())).toBeLessThan(Z_ACTIVE);
  });
});

describe("warningsByBlock", () => {
  it("groups each warning under its first block", () => {
    const overlap: LayoutWarning = { code: "overlap", ids: ["a", "b"], fixes: [] };
    const nest: LayoutWarning = { code: "implicit-containment", ids: ["a", "box"], fixes: [] };
    const other: LayoutWarning = { code: "out-of-bounds", ids: ["c"], fixes: [] };
    const empty: LayoutWarning = { code: "too-many-blocks", ids: [], fixes: [] };
    const map = warningsByBlock([overlap, nest, other, empty]);
    expect(map.get("a")).toEqual([overlap, nest]);
    expect(map.get("c")).toEqual([other]);
    expect(map.has("b")).toBe(false);
    expect(map.size).toBe(2);
  });
});

describe("keyboardGrabStep", () => {
  const base = { id: "a", rect: rect(4, 10, 4, 6), columns: 12, shiftKey: false };
  const held: KeyboardGrab = { id: "a", start: rect(4, 10, 4, 6), rect: rect(4, 10, 4, 6) };

  it("picks the focused block up with Space or Enter, and ignores other keys", () => {
    for (const key of [" ", "Enter"]) {
      expect(keyboardGrabStep(null, { ...base, key })).toEqual({ type: "grab", grab: held });
    }
    for (const key of ["ArrowLeft", "Escape", "Tab", "a", "Delete"]) expect(keyboardGrabStep(null, { ...base, key })).toEqual({ type: "none" });
  });

  it("moves 1 column or 1 row per arrow while held", () => {
    const step = keyboardGrabStep(held, { ...base, key: "ArrowRight" });
    expect(step).toEqual({ type: "move", grab: { ...held, rect: rect(5, 10, 4, 6) }, changed: true });
    const down = keyboardGrabStep(held, { ...base, key: "ArrowDown" });
    expect(down.type === "move" && down.grab.rect).toEqual(rect(4, 11, 4, 6));
  });

  it("resizes the right/bottom edge with Shift + arrows", () => {
    const wider = keyboardGrabStep(held, { ...base, key: "ArrowRight", shiftKey: true });
    expect(wider).toEqual({ type: "resize", grab: { ...held, rect: rect(4, 10, 5, 6) }, changed: true });
    const shorter = keyboardGrabStep(held, { ...base, key: "ArrowUp", shiftKey: true });
    expect(shorter.type === "resize" && shorter.grab.rect).toEqual(rect(4, 10, 4, 5));
  });

  it("keeps the start rect while moving, so a cancel can restore it", () => {
    let grab: KeyboardGrab = held;
    for (const key of ["ArrowRight", "ArrowRight", "ArrowDown"]) {
      const step = keyboardGrabStep(grab, { ...base, key });
      if (step.type !== "move") throw new Error("expected a move");
      grab = step.grab;
    }
    expect(grab.start).toEqual(held.start);
    expect(grab.rect).toEqual(rect(6, 11, 4, 6));
    expect(keyboardGrabStep(grab, { ...base, key: "Escape" })).toEqual({ type: "cancel", grab });
  });

  it("reports unchanged steps at the edges (same grab object)", () => {
    const atEdge: KeyboardGrab = { id: "a", start: rect(8, 0, 4, 6), rect: rect(8, 0, 4, 6) };
    const right = keyboardGrabStep(atEdge, { ...base, key: "ArrowRight" });
    expect(right).toEqual({ type: "move", grab: atEdge, changed: false });
    expect(right.type === "move" && right.grab).toBe(atEdge);
    const up = keyboardGrabStep(atEdge, { ...base, key: "ArrowUp" });
    expect(up.type === "move" && up.changed).toBe(false);
  });

  it("never resizes below the minimum block", () => {
    const small: KeyboardGrab = { id: "a", start: rect(0, 0, 1, 2), rect: rect(0, 0, 1, 2) };
    const narrower = keyboardGrabStep(small, { ...base, key: "ArrowLeft", shiftKey: true });
    expect(narrower.type === "resize" && narrower.changed).toBe(false);
    const shorter = keyboardGrabStep(small, { ...base, key: "ArrowUp", shiftKey: true });
    expect(shorter.type === "resize" && shorter.grab.rect).toEqual(rect(0, 0, 1, 2));
  });

  it("follows the columns of the frame", () => {
    const step = keyboardGrabStep({ id: "a", start: rect(0, 0, 4, 4), rect: rect(0, 0, 4, 4) }, { ...base, key: "ArrowRight", columns: 4 });
    expect(step.type === "move" && step.changed).toBe(false);
  });

  it("drops with Space, Enter or Tab, cancels with Esc", () => {
    for (const key of [" ", "Enter", "Tab"]) expect(keyboardGrabStep(held, { ...base, key })).toEqual({ type: "drop", grab: held });
    expect(keyboardGrabStep(held, { ...base, key: "Escape" })).toEqual({ type: "cancel", grab: held });
  });

  it("lets other keys through while holding", () => {
    for (const key of ["a", "Delete", "F2", "Home"]) expect(keyboardGrabStep(held, { ...base, key })).toEqual({ type: "none" });
  });

  it("drops a held block when grab keys come from another block", () => {
    expect(keyboardGrabStep(held, { ...base, id: "b", key: "Enter" })).toEqual({ type: "drop", grab: held });
    expect(keyboardGrabStep(held, { ...base, id: "b", key: "ArrowLeft" })).toEqual({ type: "none" });
  });
});

describe("rect helpers", () => {
  it("compares and keys rects", () => {
    expect(sameRect(rect(1, 2, 3, 4), rect(1, 2, 3, 4))).toBe(true);
    expect(sameRect(rect(1, 2, 3, 4), rect(1, 2, 3, 5))).toBe(false);
    expect(rectKey(rect(1, 2, 3, 4))).toBe("1,2,3,4");
  });
});

describe("adjustedIds", () => {
  const clamp: Adjustment = { kind: "clamp", id: "a", from: rect(10, 0, 4, 4), to: rect(8, 0, 4, 4) };
  const nest: Adjustment = { kind: "nest", id: "a", parentId: "box" };
  const clip: Adjustment = { kind: "clip", id: "b", from: rect(0, 0, 4, 4), to: rect(0, 0, 4, 3) };

  it("lists every adjusted block once", () => {
    expect(adjustedIds([clamp, nest, clip])).toEqual(new Set(["a", "b"]));
  });
});

/** Small seeded PRNG (mulberry32): property checks stay deterministic without new dependencies. */
function prng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("properties", () => {
  const devices = ["desktop", "tablet", "mobile"] as const;
  const shells = [null, { nav: "sidebar", header: true }, { nav: "rail", header: false }, { nav: "topnav", header: true }, { nav: "none", header: false }] as const;

  it("frame geometry always tiles the frame exactly with the content grid", () => {
    const random = prng(7);
    for (let i = 0; i < 300; i++) {
      const device = devices[Math.floor(random() * devices.length)]!;
      const shell = shells[Math.floor(random() * shells.length)]!;
      const g = frameGeometry(random() * 2400, device, shell);
      expect(g.frameWidth).toBeGreaterThanOrEqual(MIN_FRAME_WIDTH);
      expect(g.frameWidth).toBeLessThanOrEqual(g.deviceWidth);
      expect(g.content.left + g.content.width).toBeCloseTo(g.frameWidth);
      expect(g.metrics.colPx * g.metrics.columns).toBeCloseTo(g.content.width);
      expect(g.metrics.rowPx).toBeCloseTo(8 * g.k);
      expect(g.content.width).toBeGreaterThan(0);
    }
  });

  it("any sequence of keyboard nudges keeps a valid rect inside the frame", () => {
    const random = prng(11);
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    for (const columns of [12, 8, 4]) {
      let grab: KeyboardGrab = { id: "a", start: rect(0, 0, 2, 4), rect: rect(0, 0, 2, 4) };
      for (let i = 0; i < 400; i++) {
        const step = keyboardGrabStep(grab, { key: keys[Math.floor(random() * 4)]!, shiftKey: random() < 0.4, id: "a", rect: grab.rect, columns });
        if (step.type !== "move" && step.type !== "resize") throw new Error(`unexpected ${step.type}`);
        grab = step.grab;
        expectValid(grab.rect, columns);
        expect(grab.rect.w).toBeGreaterThanOrEqual(MIN_BLOCK_SIZE.w);
        expect(grab.rect.h).toBeGreaterThanOrEqual(MIN_BLOCK_SIZE.h);
        expect(grab.start).toEqual(rect(0, 0, 2, 4));
      }
    }
  });

  it("drops, moves, resizes and drawings always land on valid rects", () => {
    const random = prng(23);
    const point = () => ({ x: (random() - 0.2) * 1600, y: (random() - 0.2) * 900 });
    for (let i = 0; i < 400; i++) {
      const m: GridMetrics = { colPx: 20 + random() * 120, rowPx: 2 + random() * 10, columns: [12, 8, 4][Math.floor(random() * 3)]! };
      const size = { w: 1 + Math.floor(random() * 14), h: 1 + Math.floor(random() * 80) };
      expectValid(dropRect(point(), size, m), m.columns);
      const start = dropRect(point(), size, m);
      expectValid(moveGesture(start, point(), point(), m), m.columns);
      const handle = HANDLES[Math.floor(random() * HANDLES.length)]!;
      expectValid(resizeGesture(start, handle, point(), point(), m), m.columns);
      expectValid(drawGesture(point(), point(), m), m.columns);
    }
  });

  it("a move keeps the block's size", () => {
    const random = prng(5);
    for (let i = 0; i < 200; i++) {
      const start = rect(Math.floor(random() * 8), Math.floor(random() * 50), 1 + Math.floor(random() * 4), 2 + Math.floor(random() * 30));
      const moved = moveGesture(start, { x: 0, y: 0 }, { x: (random() - 0.5) * 3000, y: (random() - 0.5) * 3000 }, M);
      expect([moved.w, moved.h]).toEqual([start.w, start.h]);
    }
  });
});

describe("layout springs (finding 55)", () => {
  it("uses the smooth spring only when the device changed", () => {
    expect(layoutSpringFor(layoutKeyOf("desktop", rect(0, 0, 4, 4)), layoutKeyOf("tablet", rect(0, 0, 4, 4)))).toBe("smooth");
    expect(layoutSpringFor(layoutKeyOf("tablet", rect(0, 0, 4, 4)), layoutKeyOf("desktop", rect(1, 0, 4, 4)))).toBe("smooth");
    expect(layoutSpringFor(layoutKeyOf("desktop", rect(0, 0, 4, 4)), layoutKeyOf("desktop", rect(3, 9, 4, 4)))).toBe("snappy");
    expect(layoutKeyOf("mobile", rect(1, 2, 3, 4))).toBe(`mobile:${rectKey(rect(1, 2, 3, 4))}`);
  });
});

describe("promoteToMove (finding 17)", () => {
  it("reads the start rect after settling a keyboard-held block, not the pre-grab one", () => {
    // Held with Space and moved 4 columns right (local preview); the store still has col 1.
    let layout = layoutOf({ a: { type: "text", rect: rect(1, 0, 2, 4) }, kid: { type: "text", rect: rect(1, 0, 1, 2), parentId: "a" } });
    const settle = () => {
      // Dropping the grab commits its rect.
      layout = { ...layout, blocks: { ...layout.blocks, a: { ...layout.blocks.a!, rect: rect(5, 0, 2, 4) } } };
    };
    const move = promoteToMove("a", settle, () => layout);
    expect(move?.start).toEqual(rect(5, 0, 2, 4));
    expect(move?.followers).toEqual(new Set(["a", "kid"]));
    // Dragging one column right from where the block is shown lands on col 6, not col 2.
    expect(moveGesture(move!.start, { x: 550, y: 0 }, { x: 650, y: 0 }, M)).toEqual(rect(6, 0, 2, 4));
  });

  it("gives up when the block is gone by then", () => {
    expect(promoteToMove("a", () => {}, () => layoutOf({}))).toBeNull();
  });
});

describe("revealScrollTop / scrollAfterDeviceSwitch (finding 20, device switch)", () => {
  const view = { scrollTop: 400, height: 300 };

  it("leaves a fully visible box alone", () => {
    expect(revealScrollTop(view, { top: 450, height: 100 })).toBeNull();
    expect(revealScrollTop(view, { top: 400, height: 300 })).toBeNull();
  });

  it("scrolls the least needed, with a margin, to show a box below or above", () => {
    expect(revealScrollTop(view, { top: 680, height: 40 })).toBe(680 + 40 + 24 - 300);
    expect(revealScrollTop(view, { top: 380, height: 40 })).toBe(380 - 24);
    expect(revealScrollTop(view, { top: 10, height: 40 })).toBe(0);
  });

  it("leaves a box taller than the view alone while part of it shows, else brings its nearest edge in", () => {
    expect(revealScrollTop(view, { top: 300, height: 900 })).toBeNull();
    expect(revealScrollTop(view, { top: 800, height: 900 })).toBe(800 - 24);
    expect(revealScrollTop(view, { top: -600, height: 900 })).toBe(300 + 24 - 300);
    expect(revealScrollTop({ scrollTop: 2000, height: 300 }, { top: 100, height: 900 })).toBe(100 + 900 + 24 - 300);
  });

  it("puts a box a third of the way down in «third» mode", () => {
    expect(revealScrollTop(view, { top: 1000, height: 60 }, "third")).toBe(1000 - 80);
  });

  it("follows a held block moved by keyboard one row at a time", () => {
    let scrollTop = 0;
    const height = 300;
    for (let row = 0; row < 400; row++) {
      const box = { top: row * 4, height: 40 };
      scrollTop = revealScrollTop({ scrollTop, height }, box) ?? scrollTop;
      expect(box.top).toBeGreaterThanOrEqual(scrollTop);
      expect(box.top + box.height).toBeLessThanOrEqual(scrollTop + height);
    }
  });

  it("ignores views and boxes that cannot be measured", () => {
    expect(revealScrollTop({ scrollTop: 0, height: 0 }, { top: 500, height: 10 })).toBeNull();
    expect(revealScrollTop(view, { top: Number.NaN, height: 10 })).toBeNull();
  });

  it("after a device switch: back to the top with nothing selected, the selection revealed otherwise", () => {
    expect(scrollAfterDeviceSwitch({ scrollTop: 5000, height: 600 }, null)).toBe(0);
    expect(scrollAfterDeviceSwitch({ scrollTop: 5000, height: 600 }, { top: 300, height: 80 })).toBe(Math.round(300 - (600 - 80) / 3));
    expect(scrollAfterDeviceSwitch({ scrollTop: 200, height: 600 }, { top: 300, height: 80 })).toBe(200);
  });
});

describe("focus after a change (findings 19 / 23)", () => {
  const order = ["a", "b", "c", "d"];
  const alive = (...ids: string[]) => (id: string) => ids.includes(id);

  it("finds the nearest survivor after the block, else before it", () => {
    expect(nearestSurvivor(order, "b", alive("a", "c", "d"))).toBe("c");
    expect(nearestSurvivor(order, "d", alive("a", "b"))).toBe("b");
    expect(nearestSurvivor(order, "z", alive("c"))).toBe("c");
    expect(nearestSurvivor(order, "a", alive())).toBeNull();
  });

  it("keeps focus where it is when it was not on a block or its block survived", () => {
    expect(focusAfterChange({ focused: null, previousOrder: order, exists: alive("a"), selected: "a" })).toBeNull();
    expect(focusAfterChange({ focused: "b", previousOrder: order, exists: alive("b"), selected: null, prefer: "a" })).toBeNull();
  });

  it("never drops focus to <body> when the focused block vanished", () => {
    // ⌘D focuses the copy, ⌘Z removes it.
    expect(focusAfterChange({ focused: "copy", previousOrder: [...order, "copy"], exists: alive(...order), selected: null })).toBe("d");
    expect(focusAfterChange({ focused: "b", previousOrder: order, exists: alive("a", "c"), selected: "c" })).toBe("c");
    expect(focusAfterChange({ focused: "b", previousOrder: order, exists: alive(), selected: null })).toBe("scroller");
  });

  it("brings focus back from a closing toast or <body>: preferred block, selection, else the scroller", () => {
    expect(focusAfterChange({ focused: "lost", previousOrder: order, exists: alive("a", "x"), selected: "a", prefer: "x" })).toBe("x");
    expect(focusAfterChange({ focused: "lost", previousOrder: order, exists: alive("a"), selected: "a" })).toBe("a");
    expect(focusAfterChange({ focused: "lost", previousOrder: order, exists: alive("a", "b"), selected: null })).toBe("scroller");
  });

  it("prefers the block the change brought back", () => {
    expect(focusAfterChange({ focused: "b", previousOrder: order, exists: alive("a", "x"), selected: "a", prefer: "x" })).toBe("x");
    expect(focusAfterChange({ focused: null, previousOrder: order, exists: alive("x"), selected: null, prefer: "x" })).toBe("x");
    expect(focusAfterChange({ focused: null, previousOrder: order, exists: alive(), selected: null, prefer: "x" })).toBeNull();
  });
});

describe("derivedLayoutFor (finding 57)", () => {
  const layout = layoutOf({ a: { type: "text", rect: rect(0, 0, 4, 4) } });

  it("never derives on desktop", () => {
    let calls = 0;
    const derive = () => {
      calls++;
      throw new Error("desktop must not derive");
    };
    expect(derivedLayoutFor(layout, "desktop", derive)).toBeNull();
    expect(derivedLayoutFor(null, "tablet", derive)).toBeNull();
    expect(calls).toBe(0);
  });

  it("returns the device's derived layout on tablet and mobile", () => {
    const tablet = { breakpoint: "tablet", columns: 8, blocks: {}, nodes: {}, order: [] } as const;
    const mobile = { breakpoint: "mobile", columns: 4, blocks: {}, nodes: {}, order: [] } as const;
    const derive = () => ({ tablet: { ...tablet, order: [] }, mobile: { ...mobile, order: [] } });
    expect(derivedLayoutFor(layout, "tablet", derive)?.breakpoint).toBe("tablet");
    expect(derivedLayoutFor(layout, "mobile", derive)?.columns).toBe(4);
  });
});

describe("askingStillValid (finding 41)", () => {
  const layout = layoutOf({ drawn: { type: "free", rect: rect(0, 0, 4, 4) } });

  it("keeps «¿Qué es esto?» only on desktop with its block on the shown screen", () => {
    expect(askingStillValid("desktop", layout, "drawn")).toBe(true);
    expect(askingStillValid("tablet", layout, "drawn")).toBe(false);
    expect(askingStillValid("desktop", layoutOf({}), "drawn")).toBe(false);
    expect(askingStillValid("desktop", null, "drawn")).toBe(false);
    expect(askingStillValid("desktop", layout, null)).toBe(false);
  });
});

describe("canvas layers (findings 4, 18, 25)", () => {
  it("keeps badges above the resize handles, and both above any lifted block", () => {
    expect(Z_BADGE).toBeGreaterThan(Z_OVERLAY);
    expect(Z_OVERLAY).toBeGreaterThan(Z_ACTIVE + 100_000);
  });
});
