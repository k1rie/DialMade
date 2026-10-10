import { describe, expect, it } from "vitest";
import { isArrowKey, nudgeRect, type Rect, type Size } from "./rect";

const image: Size = { w: 100, h: 100 };
const rect: Rect = { x: 10, y: 10, w: 20, h: 20 };

describe("arrow keys of the cropper", () => {
  it("knows the four arrows", () => {
    for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) expect(isArrowKey(key)).toBe(true);
    expect(isArrowKey("Enter")).toBe(false);
  });

  it("ignores keys that only exist on the object prototype", () => {
    for (const key of ["toString", "constructor", "hasOwnProperty", "__proto__"]) {
      expect(isArrowKey(key)).toBe(false);
      expect(nudgeRect(rect, key, 1, false, false, image, 4)).toBe(rect);
    }
  });

  it("moves and resizes by the step", () => {
    expect(nudgeRect(rect, "ArrowRight", 5, false, false, image, 4)).toEqual({ ...rect, x: 15 });
    expect(nudgeRect(rect, "ArrowDown", 5, true, false, image, 4)).toEqual({ ...rect, h: 25 });
  });
});
