import { describe, expect, it } from "vitest";
import { dropRectOf } from "./dropTarget";

const cell = { left: 120, top: 80, width: 240, height: 96 };

describe("dropRectOf", () => {
  it("reads the landing rect a droppable provides", () => {
    expect(dropRectOf({ label: "Lienzo", dropRect: () => cell })).toEqual(cell);
  });

  it("falls back (null) without a provider, or when it has no rect", () => {
    expect(dropRectOf(undefined)).toBeNull();
    expect(dropRectOf({ label: "Primario" })).toBeNull();
    expect(dropRectOf({ dropRect: () => null })).toBeNull();
    expect(dropRectOf({ dropRect: "nope" })).toBeNull();
  });

  it("ignores empty or broken rects", () => {
    expect(dropRectOf({ dropRect: () => ({ ...cell, width: 0 }) })).toBeNull();
    expect(dropRectOf({ dropRect: () => ({ ...cell, top: Number.NaN }) })).toBeNull();
  });
});
