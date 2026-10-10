import { describe, expect, it } from "vitest";
import { TOAST_CLEARANCE_GAP_PX, toastLift } from "./useToastClearance";

const VIEWPORT = 900;
const bar = (top: number, height = 56) => ({ top, bottom: top + height, height });

describe("toastLift", () => {
  it("lifts the toasts above a bar at the bottom of the viewport", () => {
    // The Layout canvas bar: 16 px above the canvas bottom, which ends 24 px above the viewport bottom.
    expect(toastLift(bar(VIEWPORT - 40 - 56), VIEWPORT)).toBe(96 + TOAST_CLEARANCE_GAP_PX);
    // The sticky bar of the narrow layout: 12 px from the bottom.
    expect(toastLift(bar(VIEWPORT - 12 - 56), VIEWPORT)).toBe(68 + TOAST_CLEARANCE_GAP_PX);
  });

  it("leaves the default offset when the bar cannot be covered", () => {
    expect(toastLift(bar(200), VIEWPORT)).toBeNull(); // upper half
    expect(toastLift(bar(VIEWPORT + 10), VIEWPORT)).toBeNull(); // below the fold
    expect(toastLift(bar(-80), VIEWPORT)).toBeNull(); // scrolled away
    expect(toastLift(bar(700, 0), VIEWPORT)).toBeNull(); // hidden
  });

  it("rounds up to whole px", () => {
    expect(toastLift(bar(800.4), VIEWPORT)).toBe(Math.ceil(99.6 + TOAST_CLEARANCE_GAP_PX));
  });
});
