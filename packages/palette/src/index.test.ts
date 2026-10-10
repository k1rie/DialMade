import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, hexToOklch } from "./index";

describe("@dialmade/palette", () => {
  it("exposes an engine version", () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("converts hex to OKLCH", () => {
    const white = hexToOklch("#ffffff");
    expect(white?.l).toBeCloseTo(1, 3);
    expect(white?.c).toBeCloseTo(0, 3);
  });

  it("returns null for invalid input", () => {
    expect(hexToOklch("not-a-color")).toBeNull();
  });
});
