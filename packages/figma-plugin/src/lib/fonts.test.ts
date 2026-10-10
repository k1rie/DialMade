import { describe, expect, it } from "vitest";
import { pickStyle, resolveFont, styleWeight } from "./fonts";

const fonts = [
  { family: "Inter", style: "Regular" },
  { family: "Inter", style: "Semi Bold" },
  { family: "Inter", style: "Bold" },
  { family: "Inter", style: "Bold Italic" },
  { family: "Fraunces", style: "Light" },
  { family: "Fraunces", style: "Black" },
];

describe("fonts", () => {
  it("reads weights from Figma style names", () => {
    expect(styleWeight("Semi Bold")).toBe(600);
    expect(styleWeight("SemiBold")).toBe(600);
    expect(styleWeight("ExtraLight Italic")).toBe(200);
    expect(styleWeight("Book")).toBe(400);
    expect(styleWeight("Condensed")).toBeNull();
  });

  it("picks the nearest upright style", () => {
    expect(pickStyle(fonts, "Inter", 600)).toBe("Semi Bold");
    expect(pickStyle(fonts, "inter", 500)).toBe("Semi Bold");
    expect(pickStyle(fonts, "Inter", 800)).toBe("Bold");
    expect(pickStyle(fonts, "Fraunces", 600)).toBe("Black");
    expect(pickStyle(fonts, "Satoshi", 400)).toBeNull();
  });

  it("falls back and says so", () => {
    expect(resolveFont(fonts, "Inter", 700, "Inter")).toEqual({ font: { family: "Inter", style: "Bold" }, substituted: false, requested: "Inter" });
    expect(resolveFont(fonts, "Satoshi", 700, "Inter")).toEqual({ font: { family: "Inter", style: "Bold" }, substituted: true, requested: "Satoshi" });
    expect(resolveFont([], "Satoshi", 700, "Inter").font).toEqual({ family: "Inter", style: "Regular" });
  });
});
