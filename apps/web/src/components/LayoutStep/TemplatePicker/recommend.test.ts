import { describe, expect, it } from "vitest";
import { recommendedSet } from "./recommend";

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
