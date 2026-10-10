import { describe, expect, it, vi } from "vitest";
import { createPopoverFocus } from "./popoverFocus";

const target = () => ({ focus: vi.fn<(options?: FocusOptions) => void>() });

describe("createPopoverFocus", () => {
  it("first opening: no focus while the panel is hidden for measuring, then focus as soon as it shows", () => {
    const focus = createPopoverFocus();
    const first = target();
    focus.opened();
    // The commit of the opening: the panel is still `visibility: hidden` (no position yet).
    expect(focus.moveIn(first, false)).toBe(false);
    expect(first.focus).not.toHaveBeenCalled();
    // The synchronous render with the position: now it is shown.
    expect(focus.moveIn(first, true)).toBe(true);
    expect(first.focus).toHaveBeenCalledTimes(1);
    expect(first.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("moves focus in once per opening: repositioning (scroll, resize) never steals it back", () => {
    const focus = createPopoverFocus();
    const first = target();
    focus.opened();
    focus.moveIn(first, true);
    expect(focus.moveIn(first, true)).toBe(false);
    expect(first.focus).toHaveBeenCalledTimes(1);
    // A later opening (position cached, shown at once) moves it in again.
    focus.closed("elsewhere", target());
    focus.opened();
    expect(focus.moveIn(first, true)).toBe(true);
    expect(first.focus).toHaveBeenCalledTimes(2);
  });

  it("waits for the panel to exist, and does nothing while closed", () => {
    const focus = createPopoverFocus();
    const first = target();
    expect(focus.moveIn(first, true)).toBe(false);
    focus.opened();
    expect(focus.moveIn(null, true)).toBe(false);
    expect(focus.moveIn(first, true)).toBe(true);
    focus.closed("elsewhere", null);
    expect(focus.moveIn(first, true)).toBe(false);
    expect(first.focus).toHaveBeenCalledTimes(1);
  });

  it("closing with focus inside the panel (an item that closes it) returns focus to the trigger", () => {
    const focus = createPopoverFocus();
    const trigger = target();
    focus.opened();
    focus.moveIn(target(), true);
    focus.pressed(true);
    expect(focus.closed("inside", trigger)).toBe(true);
    expect(trigger.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("closing after the focused control was removed (focus on <body>) returns it to the trigger too", () => {
    const focus = createPopoverFocus();
    const trigger = target();
    focus.opened();
    expect(focus.closed("lost", trigger)).toBe(true);
    expect(trigger.focus).toHaveBeenCalledTimes(1);
  });

  it("leaves focus alone when it already went elsewhere (Esc and Tab put it on the trigger, focus moved on)", () => {
    const focus = createPopoverFocus();
    const trigger = target();
    focus.opened();
    expect(focus.closed("elsewhere", trigger)).toBe(false);
    expect(trigger.focus).not.toHaveBeenCalled();
  });

  it("a press elsewhere closes it without pulling focus back: the press puts focus where it lands", () => {
    const focus = createPopoverFocus();
    const trigger = target();
    focus.opened();
    focus.pressed(false);
    expect(focus.closed("inside", trigger)).toBe(false);
    expect(trigger.focus).not.toHaveBeenCalled();
    // The next opening starts clean.
    focus.opened();
    expect(focus.closed("inside", trigger)).toBe(true);
  });

  it("a press on the popover itself (an item, the trigger) still returns focus on close", () => {
    const focus = createPopoverFocus();
    const trigger = target();
    focus.opened();
    focus.pressed(false);
    focus.pressed(true);
    expect(focus.closed("lost", trigger)).toBe(true);
  });

  it("no trigger to return to: nothing happens", () => {
    const focus = createPopoverFocus();
    focus.opened();
    expect(focus.closed("inside", null)).toBe(false);
  });
});
