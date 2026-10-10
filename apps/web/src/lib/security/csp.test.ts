import { describe, expect, it } from "vitest";
import { appCsp, appCspDirectives, appSecurityHeaders } from "./csp";

describe("the app's CSP", () => {
  it("connects only to itself and to api.anthropic.com (BYOK)", () => {
    const csp = appCspDirectives({ dev: false, previewOrigin: "https://preview.dialmade.vercel.app" });
    expect(csp["connect-src"]).toEqual(["'self'", "blob:", "data:", "https://api.anthropic.com"]);
    expect(csp["object-src"]).toEqual(["'none'"]);
    expect(csp["script-src"]).not.toContain("'unsafe-eval'");
  });

  it("frames only the preview origin, and nothing when it is missing, invalid or the app itself", () => {
    expect(appCspDirectives({ dev: false, previewOrigin: "https://preview.dialmade.vercel.app/island.html" })["frame-src"]).toEqual(["https://preview.dialmade.vercel.app"]);
    expect(appCspDirectives({ dev: false })["frame-src"]).toEqual(["'none'"]);
    expect(appCspDirectives({ dev: false, previewOrigin: "javascript:alert(1)" })["frame-src"]).toEqual(["'none'"]);
    expect(appCspDirectives({ dev: false, previewOrigin: "http://localhost:3640", appUrl: "http://localhost:3640/" })["frame-src"]).toEqual(["'none'"]);
  });

  it("development adds eval and the HMR socket, nothing else", () => {
    const dev = appCspDirectives({ dev: true, previewOrigin: "http://localhost:3641" });
    expect(dev["script-src"]).toContain("'unsafe-eval'");
    expect(dev["connect-src"]).toEqual(expect.arrayContaining(["ws:", "https://api.anthropic.com"]));
    expect(dev["frame-src"]).toEqual(["http://localhost:3641"]);
  });

  it("serializes as one header", () => {
    expect(appCsp({ dev: false })).toMatch(/^default-src 'self'; script-src 'self' 'unsafe-inline'; /);
    expect(appSecurityHeaders({ dev: false }).map((header) => header.key)).toEqual(["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy"]);
  });
});
