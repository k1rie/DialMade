// Where focus lands when a step of the flow opens (PaletteFlow's Stage). Pure: it only asks `closest`, so it is
// tested without a DOM.

/** What these rules read of an element. */
export type ElementLike = { closest(selectors: string): unknown };

/** Ancestors that keep an element from taking focus, or from being announced. */
const OUT_OF_REACH = '[inert], [aria-hidden="true"], [hidden]';

/**
 * Whether a heading can be the step's focus target: not inside an inert, hidden or aria-hidden subtree (focus on
 * it would do nothing, and focus would stay on <body>), and not the user's own page (inside a ThemeScope but not
 * its app chrome: a screen's h1 in Ajustar's preview is content, not the step's title).
 */
export function canTakeStepFocus(element: ElementLike): boolean {
  if (element.closest(OUT_OF_REACH)) return false;
  return !(element.closest(".app-theme-scope") && !element.closest(".app-chrome"));
}

/**
 * Whether focus was left without a place when a step opened: nothing (or <body>) has it, the step's own region
 * has it (its title may still render), it is in the step that is leaving, or on a toast that is about to close.
 */
export function focusStranded(active: (ElementLike & object) | null, isBody: boolean, inStep: boolean, isStep: boolean): boolean {
  if (!active || isBody || isStep) return true;
  if (active.closest("[data-sonner-toaster]")) return true;
  return active.closest("[data-step]") !== null && !inStep;
}
