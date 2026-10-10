import { describe, expect, it } from "vitest";
import { canTakeStepFocus, focusStranded, type ElementLike } from "./stepFocus";

/** An element whose ancestors (itself included) match the given simple selectors. */
function element(...matches: string[]): ElementLike & object {
  return {
    closest: (selectors: string) => (selectors.split(",").some((selector) => matches.includes(selector.trim())) ? {} : null),
  };
}

describe("where focus lands when a step opens (review B #7)", () => {
  it("skips headings that cannot take focus: inert (Ajustar's edit preview), hidden or aria-hidden", () => {
    expect(canTakeStepFocus(element("[inert]"))).toBe(false);
    expect(canTakeStepFocus(element('[aria-hidden="true"]'))).toBe(false);
    expect(canTakeStepFocus(element("[hidden]"))).toBe(false);
  });

  it("skips the user's own page headings (inside a ThemeScope), but not the app chrome inside one", () => {
    expect(canTakeStepFocus(element(".app-theme-scope"))).toBe(false);
    expect(canTakeStepFocus(element(".app-theme-scope", ".app-chrome"))).toBe(true);
    expect(canTakeStepFocus(element())).toBe(true);
  });

  it("moves focus only when it was left without a place", () => {
    expect(focusStranded(null, false, false, false)).toBe(true);
    expect(focusStranded(element(), true, false, false)).toBe(true);
    // The step region itself (its title may still render).
    expect(focusStranded(element("[data-step]"), false, false, true)).toBe(true);
    // In the step that is leaving, or on a toast about to close («Desbloquear y borrar» → Ajustar).
    expect(focusStranded(element("[data-step]"), false, false, false)).toBe(true);
    expect(focusStranded(element("[data-sonner-toaster]"), false, false, false)).toBe(true);
    // Inside the new step, or on the stepper: left alone.
    expect(focusStranded(element("[data-step]"), false, true, false)).toBe(false);
    expect(focusStranded(element(), false, false, false)).toBe(false);
  });
});
