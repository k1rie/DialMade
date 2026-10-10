/** Anything that takes focus: an element of the page (a stub in the tests). */
export type Focusable = { focus(options?: FocusOptions): void };

/** Where focus is when the popover closes: in its panel, nowhere (`<body>`, its control was removed) or elsewhere. */
export type FocusAtClose = "inside" | "lost" | "elsewhere";

export type PopoverFocus = {
  /** The popover opened: focus moves in as soon as the panel is shown. */
  opened(): void;
  /**
   * Moves focus to `target` once per opening, and only when the panel is `visible`: the first opening renders it
   * hidden while it is measured, and a hidden control does not take focus (focus would stay on the trigger and
   * the next Tab would close the popover). Returns whether it moved focus.
   */
  moveIn(target: Focusable | null | undefined, visible: boolean): boolean;
  /** A pointer press, on the popover (panel or trigger) or elsewhere. */
  pressed(onPopover: boolean): void;
  /**
   * The popover closed. Focus goes back to the trigger when it was still in the panel (an item that closes it)
   * or got lost with a removed control, unless a press elsewhere closed it: that press puts focus where it lands.
   * Returns whether it moved focus.
   */
  closed(at: FocusAtClose, trigger: Focusable | null | undefined): boolean;
};

/** Focus bookkeeping of one popover (see `PopoverFocus`); the component calls it from its effects. */
export function createPopoverFocus(): PopoverFocus {
  let pending = false;
  let pressedElsewhere = false;
  return {
    opened() {
      pending = true;
      pressedElsewhere = false;
    },
    moveIn(target, visible) {
      if (!pending || !visible || !target) return false;
      pending = false;
      target.focus({ preventScroll: true });
      return true;
    },
    pressed(onPopover) {
      pressedElsewhere = !onPopover;
    },
    closed(at, trigger) {
      const back = !pressedElsewhere && at !== "elsewhere" && !!trigger;
      pending = false;
      pressedElsewhere = false;
      if (back) trigger.focus({ preventScroll: true });
      return back;
    },
  };
}
