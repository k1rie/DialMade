import { describe, expect, it } from "vitest";
import { islandUrl, previewOrigin } from "./preview";

describe("preview origin", () => {
  it("is off without a valid separate origin (no srcdoc fallback, also in production)", () => {
    expect(previewOrigin(undefined)).toBeNull();
    expect(previewOrigin("")).toBeNull();
    expect(previewOrigin("javascript:alert(1)")).toBeNull();
    expect(previewOrigin("not a url")).toBeNull();
    expect(previewOrigin("http://localhost:3611/path")).toBe("http://localhost:3611");
  });

  it("builds the island URL with the parent origin", () => {
    expect(islandUrl("https://p.example", "https://app.example")).toBe("https://p.example/island.html?parent=https%3A%2F%2Fapp.example");
  });
});
