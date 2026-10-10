import { describe, expect, it } from "vitest";
import { recommendedSet, SET_KINDS } from "./recommend";

describe("recommendedSet", () => {
  it("recommends the set that matches the brief's focus", () => {
    expect(recommendedSet("app")).toBe("saas-app");
    expect(recommendedSet("landing")).toBe("landing");
  });

  it("recommends nothing for a brand-only focus or an unknown one", () => {
    expect(recommendedSet("brand")).toBeNull();
    expect(recommendedSet(undefined)).toBeNull();
  });
});

describe("SET_KINDS", () => {
  it("recommending a set's own kind recommends that set", () => {
    for (const [setId, kind] of Object.entries(SET_KINDS)) expect(recommendedSet(kind)).toBe(setId);
  });
});
