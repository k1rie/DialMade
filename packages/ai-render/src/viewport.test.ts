import { describe, expect, it } from "vitest";
import { pinViewportUnits } from "./viewport";

describe("pinViewportUnits", () => {
  it("turns vw into px at the page's width and leaves the rest", () => {
    expect(pinViewportUnits({ "--dl-fs-display": "clamp(2.25rem, 1.5rem + 3.125vw, 3.5rem)", "--primary": "oklch(0.5 0.1 200)", "--x": "-.5vw" }, 1280)).toEqual({
      "--dl-fs-display": "clamp(2.25rem, 1.5rem + 40px, 3.5rem)",
      "--primary": "oklch(0.5 0.1 200)",
      "--x": "-6.4px",
    });
  });
});
