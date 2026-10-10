import { describe, expect, it } from "vitest";
import { previewHeaders } from "./headers.ts";

describe("preview origin headers", () => {
  it("lock the islands down: no network, no forms, no frames, only the app may frame them", () => {
    const csp = previewHeaders("http://localhost:3610/some/path")["Content-Security-Policy"];
    for (const directive of ["default-src 'none'", "script-src 'self'", "connect-src 'none'", "form-action 'none'", "frame-src 'none'", "base-uri 'none'", "require-trusted-types-for 'script'", "frame-ancestors http://localhost:3610"]) {
      expect(csp).toContain(directive);
    }
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("rejects an invalid app origin", () => {
    expect(() => previewHeaders("not a url")).toThrow();
  });
});
