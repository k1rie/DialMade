import { describe, expect, it } from "vitest";
import { clampOffset, dragSpan, exceedsThreshold, overIndex, screenKeyStep, shiftFor, slotOffset, stepIndex, type RowBox, type ScreenKey } from "./reorder";

/** Four rows of 44 px with a 4 px gap. */
const boxes: RowBox[] = [0, 48, 96, 144].map((top) => ({ top, height: 44 }));
const centerOf = (from: number, offset: number) => boxes[from]!.top + boxes[from]!.height / 2 + offset;

describe("reorder geometry", () => {
  it("starts a drag only past the threshold", () => {
    expect(exceedsThreshold(2, 2)).toBe(false);
    expect(exceedsThreshold(0, 4)).toBe(true);
    expect(exceedsThreshold(3, 3)).toBe(true);
  });

  it("finds the slot under the dragged row's middle", () => {
    expect(overIndex(boxes, 0, centerOf(0, 0))).toBe(0);
    // The next row's middle is 48 px below: it is passed only once the middles cross.
    expect(overIndex(boxes, 0, centerOf(0, 40))).toBe(0);
    expect(overIndex(boxes, 0, centerOf(0, 50))).toBe(1);
    expect(overIndex(boxes, 0, centerOf(0, 200))).toBe(3);
    expect(overIndex(boxes, 3, centerOf(3, -100))).toBe(1);
    expect(overIndex(boxes, 3, centerOf(3, -500))).toBe(0);
  });

  it("measures the span as height plus gap, also for the last row", () => {
    expect(dragSpan(boxes, 0)).toBe(48);
    expect(dragSpan(boxes, 3)).toBe(48);
    expect(dragSpan([{ top: 0, height: 44 }], 0)).toBe(44);
    expect(dragSpan(boxes, 9)).toBe(0);
  });

  it("moves only the rows between the origin and the target, towards the origin", () => {
    // Row 0 dragged over slot 2: rows 1 and 2 move up.
    expect([0, 1, 2, 3].map((i) => shiftFor(i, 0, 2, 48))).toEqual([0, -48, -48, 0]);
    // Row 3 dragged over slot 1: rows 1 and 2 move down.
    expect([0, 1, 2, 3].map((i) => shiftFor(i, 3, 1, 48))).toEqual([0, 48, 48, 0]);
    expect([0, 1, 2, 3].map((i) => shiftFor(i, 2, 2, 48))).toEqual([0, 0, 0, 0]);
  });

  it("keeps the dragged row inside the list", () => {
    expect(clampOffset(boxes, 1, -500)).toBe(-48);
    expect(clampOffset(boxes, 1, 500)).toBe(96);
    expect(clampOffset(boxes, 1, 10)).toBe(10);
    expect(clampOffset(boxes, 1, Number.NaN)).toBe(0);
    expect(clampOffset([], 0, 10)).toBe(0);
  });

  it("steps with Alt+arrows and stops at the edges", () => {
    expect(stepIndex(1, -1, 3)).toBe(0);
    expect(stepIndex(1, 1, 3)).toBe(2);
    expect(stepIndex(0, -1, 3)).toBeNull();
    expect(stepIndex(2, 1, 3)).toBeNull();
    expect(stepIndex(-1, 1, 3)).toBeNull();
    expect(stepIndex(1, 0, 3)).toBeNull();
  });
});

describe("keyboard on screen rows (review B #17: Space/Enter are grab and drop)", () => {
  const key = (name: string, mods: Partial<Omit<ScreenKey, "key">> = {}): ScreenKey => ({
    key: name,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...mods,
  });

  it("Space and Enter pick the row up (with more than one screen), never open it", () => {
    expect(screenKeyStep(null, "s-a", 1, 4, key(" "))).toEqual({ type: "grab" });
    expect(screenKeyStep(null, "s-a", 1, 4, key("Enter"))).toEqual({ type: "grab" });
    expect(screenKeyStep(null, "s-a", 0, 1, key("Enter"))).toEqual({ type: "none" });
    expect(screenKeyStep(null, "s-a", 1, 4, key("Enter", { shiftKey: true }))).toEqual({ type: "none" });
  });

  it("while held, arrows, Home and End move it; the ends refuse; Space/Enter drop; Tab drops and moves on; Esc cancels", () => {
    const held = { id: "s-a", at: 1 };
    expect(screenKeyStep(held, "s-a", 1, 4, key("ArrowDown"))).toEqual({ type: "move", to: 2 });
    expect(screenKeyStep(held, "s-a", 1, 4, key("ArrowUp"))).toEqual({ type: "move", to: 0 });
    expect(screenKeyStep(held, "s-a", 1, 4, key("End"))).toEqual({ type: "move", to: 3 });
    expect(screenKeyStep({ id: "s-a", at: 0 }, "s-a", 1, 4, key("ArrowUp"))).toEqual({ type: "edge", delta: -1 });
    expect(screenKeyStep({ id: "s-a", at: 3 }, "s-a", 1, 4, key("ArrowDown"))).toEqual({ type: "edge", delta: 1 });
    expect(screenKeyStep({ id: "s-a", at: 0 }, "s-a", 1, 4, key("Home"))).toEqual({ type: "edge", delta: -1 });
    expect(screenKeyStep(held, "s-a", 1, 4, key(" "))).toEqual({ type: "drop", keepKey: false });
    expect(screenKeyStep(held, "s-a", 1, 4, key("Enter"))).toEqual({ type: "drop", keepKey: false });
    expect(screenKeyStep(held, "s-a", 1, 4, key("Tab", { shiftKey: true }))).toEqual({ type: "drop", keepKey: true });
    expect(screenKeyStep(held, "s-a", 1, 4, key("Escape"))).toEqual({ type: "cancel" });
    expect(screenKeyStep(held, "s-a", 1, 4, key("F2"))).toEqual({ type: "none" });
    // Another row's keys while one is held: the held row is dropped first.
    expect(screenKeyStep(held, "s-b", 2, 4, key("ArrowDown"))).toEqual({ type: "drop", keepKey: true });
  });

  it("not held, arrows, Home and End move focus to a row (it gets selected, like tabs); no wrap", () => {
    expect(screenKeyStep(null, "s-a", 1, 4, key("ArrowDown"))).toEqual({ type: "focus", to: 2 });
    expect(screenKeyStep(null, "s-a", 1, 4, key("ArrowUp"))).toEqual({ type: "focus", to: 0 });
    expect(screenKeyStep(null, "s-a", 0, 4, key("ArrowUp"))).toEqual({ type: "focus", to: 0 });
    expect(screenKeyStep(null, "s-a", 1, 4, key("Home"))).toEqual({ type: "focus", to: 0 });
    expect(screenKeyStep(null, "s-a", 1, 4, key("End"))).toEqual({ type: "focus", to: 3 });
  });

  it("keeps Alt+↑/↓ (one step), F2 and the context menu key as alternatives", () => {
    expect(screenKeyStep(null, "s-a", 1, 4, key("ArrowUp", { altKey: true }))).toEqual({ type: "shift", delta: -1 });
    expect(screenKeyStep(null, "s-a", 1, 4, key("ArrowDown", { altKey: true }))).toEqual({ type: "shift", delta: 1 });
    expect(screenKeyStep(null, "s-a", 1, 4, key("F2"))).toEqual({ type: "rename" });
    expect(screenKeyStep(null, "s-a", 1, 4, key("ContextMenu"))).toEqual({ type: "menu" });
    expect(screenKeyStep(null, "s-a", 1, 4, key("F10", { shiftKey: true }))).toEqual({ type: "menu" });
    expect(screenKeyStep(null, "s-a", 1, 4, key("ArrowDown", { ctrlKey: true }))).toEqual({ type: "none" });
  });

  it("slotOffset draws the held row in its target slot (the others make room with shiftFor)", () => {
    expect(slotOffset(boxes, 0, 0)).toBe(0);
    // Down to slot 2: its bottom meets the bottom of row 2 (140 + 44 − 44 = 96).
    expect(slotOffset(boxes, 0, 2)).toBe(96);
    // Up from 3 to 1: its top meets row 1's top.
    expect(slotOffset(boxes, 3, 1)).toBe(48 - 144);
    expect(slotOffset(boxes, 9, 1)).toBe(0);
  });
});
