import { describe, expect, it } from "vitest";
import { parsePromoParams } from "./params";

const parse = (query: string) => parsePromoParams(new URLSearchParams(query));

describe("parsePromoParams", () => {
  it("lists the scenes without `scene`", () => {
    expect(parse("")).toEqual({ kind: "index" });
    expect(parse("scene=")).toEqual({ kind: "index" });
  });

  it("defaults to Spanish, desktop and the app background", () => {
    expect(parse("scene=palette")).toEqual({
      kind: "scene",
      params: { scene: "palette", only: null, transparent: false, lang: "es", viewport: "desktop" },
    });
  });

  it("reads only, bg=transparent, lang and viewport=mobile", () => {
    expect(parse("scene=home&only=dialmark&bg=transparent&lang=en&viewport=mobile")).toEqual({
      kind: "scene",
      params: { scene: "home", only: "dialmark", transparent: true, lang: "en", viewport: "mobile" },
    });
  });

  it("refuses what the manifest does not have", () => {
    expect(parse("scene=nope")).toEqual({ kind: "error", error: { code: "unknown-scene", value: "nope" } });
    expect(parse("scene=home&only=swatches")).toEqual({ kind: "error", error: { code: "unknown-part", scene: "home", value: "swatches" } });
    expect(parse("scene=home&lang=fr")).toEqual({ kind: "error", error: { code: "unknown-lang", value: "fr" } });
    expect(parse("scene=home&viewport=tablet")).toEqual({ kind: "error", error: { code: "unknown-viewport", value: "tablet" } });
    expect(parse("scene=home&bg=white")).toEqual({ kind: "error", error: { code: "unknown-bg", value: "white" } });
  });
});
