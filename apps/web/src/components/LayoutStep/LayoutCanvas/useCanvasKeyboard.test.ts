import type { GridRect } from "@dialmade/layout";
import type { KeyboardEvent, RefObject } from "react";
import { describe, expect, it } from "vitest";
import type { KeyboardGrab } from "./gestures";
// Aliased: it calls no React hook, so it runs here as a plain function.
import { useCanvasKeyboard as canvasKeyboard, type CanvasKeyboardActions } from "./useCanvasKeyboard";

/*
 * `useCanvasKeyboard` calls no React hook: it is driven here with plain objects standing in for the
 * focused block and the keyboard events.
 */

const rect = (col: number, row: number, w: number, h: number): GridRect => ({ col, row, w, h });

function setup(grab: KeyboardGrab | null = null) {
  const calls: string[] = [];
  const record = (name: string) => () => void calls.push(name);
  const actions: CanvasKeyboardActions = {
    readOnly: record("readOnly"),
    grab: record("grab"),
    nudge: record("nudge"),
    drop: record("drop"),
    cancel: record("cancel"),
    remove: record("remove"),
    duplicate: record("duplicate"),
    rename: record("rename"),
    undo: record("undo"),
    redo: record("redo"),
    setTool: record("setTool"),
    deselect: record("deselect"),
  };
  const block = { getAttribute: (name: string) => (name === "data-block-id" ? "a" : null), isContentEditable: false, closest: () => null };
  const rootRef = { current: { contains: () => true } } as unknown as RefObject<HTMLElement | null>;
  const keyboard = canvasKeyboard({
    rootRef,
    rectOf: () => rect(0, 0, 4, 10),
    editable: true,
    columns: 12,
    selectedId: "a",
    grab,
    shortcutsEnabled: true,
    actions,
  });
  const press = (key: string, options: { repeat?: boolean; meta?: boolean; shift?: boolean } = {}) => {
    const event = {
      key,
      repeat: options.repeat ?? false,
      metaKey: options.meta ?? false,
      ctrlKey: false,
      shiftKey: options.shift ?? false,
      altKey: false,
      defaultPrevented: false,
      target: block,
      preventDefault() {
        event.defaultPrevented = true;
      },
    };
    keyboard.onKeyDown(event as unknown as KeyboardEvent<HTMLElement>);
    return event;
  };
  return { calls, press };
}

describe("canvas keyboard and key auto-repeat (finding 29)", () => {
  it("deletes once while Backspace / Supr is held", () => {
    const { calls, press } = setup();
    press("Backspace");
    press("Backspace", { repeat: true });
    press("Delete", { repeat: true });
    expect(calls).toEqual(["remove"]);
  });

  it("duplicates once while ⌘D is held, and renames once while F2 is held", () => {
    const { calls, press } = setup();
    press("d", { meta: true });
    press("d", { meta: true, repeat: true });
    press("F2");
    press("F2", { repeat: true });
    expect(calls).toEqual(["duplicate", "rename"]);
  });

  it("picks a block up once while Space is held (and keeps the page from scrolling)", () => {
    const { calls, press } = setup();
    press(" ");
    const repeat = press(" ", { repeat: true });
    expect(calls).toEqual(["grab"]);
    expect(repeat.defaultPrevented).toBe(true);
  });

  it("never drops a held block on a repeated Space, but keeps moving it with held arrows", () => {
    const held: KeyboardGrab = { id: "a", start: rect(0, 0, 4, 10), rect: rect(0, 0, 4, 10) };
    const { calls, press } = setup(held);
    press(" ", { repeat: true });
    press("ArrowRight", { repeat: true });
    press("ArrowDown", { repeat: true, shift: true });
    expect(calls).toEqual(["nudge", "nudge"]);
  });

  it("repeats undo and redo while held", () => {
    const { calls, press } = setup();
    press("z", { meta: true });
    press("z", { meta: true, repeat: true });
    press("z", { meta: true, shift: true, repeat: true });
    expect(calls).toEqual(["undo", "undo", "redo"]);
  });
});
