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

describe("production config of the preview origin", () => {
  it("writes the same headers for Cloudflare Pages / Netlify and for Vercel", async () => {
    const { headersFile, vercelConfig } = await import("./build-output.ts");
    const headers = previewHeaders("https://dialmade.app");
    const file = headersFile("https://dialmade.app/");
    expect(file.split("\n")[0]).toBe("/*");
    for (const [name, value] of Object.entries(headers)) expect(file).toContain(`  ${name}: ${value}`);
    expect(vercelConfig("https://dialmade.app")).toEqual({ version: 3, routes: [{ src: "/(.*)", headers, continue: true }, { handle: "filesystem" }] });
  });

  it("needs the app origin in production builds, never a default", async () => {
    const { buildAppOrigin } = await import("./build-output.ts");
    expect(buildAppOrigin({ PREVIEW_APP_ORIGIN: "https://dialmade.app/x" })).toBe("https://dialmade.app");
    expect(buildAppOrigin({ NEXT_PUBLIC_APP_URL: "https://dialmade.app" })).toBe("https://dialmade.app");
    expect(buildAppOrigin({})).toBe("http://localhost:3610");
    expect(() => buildAppOrigin({ VERCEL_ENV: "production" })).toThrow(/PREVIEW_APP_ORIGIN/);
  });
});
