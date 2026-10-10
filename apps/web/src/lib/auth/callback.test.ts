import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "./callback";

describe("safeCallbackPath", () => {
  it("keeps paths of this app", () => {
    expect(safeCallbackPath("/designs")).toBe("/designs");
    expect(safeCallbackPath("/?resume=save")).toBe("/?resume=save");
    expect(safeCallbackPath("/designs?q=a#top")).toBe("/designs?q=a#top");
  });

  it("refuses anything that leaves the origin (open redirect)", () => {
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "///evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "/\t/evil.example",
      "evil.example",
      "",
      null,
      42,
      "/api/auth/sign-out",
    ]) {
      expect(safeCallbackPath(value), String(value)).toBe("/");
    }
    expect(safeCallbackPath("https://evil.example", "/designs")).toBe("/designs");
  });
});
