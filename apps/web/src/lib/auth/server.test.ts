import { describe, expect, it } from "vitest";
import { CLIENT_IP_HEADER } from "./auth";
import { guardAuthRequest, withClientIp } from "./server";

describe("withClientIp", () => {
  it("replaces a client-sent IP header with the trusted one, and keeps the body", async () => {
    const request = new Request("http://localhost:3700/api/auth/sign-in/magic-link", {
      method: "POST",
      headers: { [CLIENT_IP_HEADER]: "1.2.3.4", "x-forwarded-for": "6.6.6.6, 203.0.113.9", "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.c" }),
    });
    const rebuilt = withClientIp(request, { NODE_ENV: "production", DIALMADE_TRUSTED_PROXY_HOPS: "1" });
    expect(rebuilt.headers.get(CLIENT_IP_HEADER)).toBe("203.0.113.9");
    expect(await rebuilt.json()).toEqual({ email: "a@b.c" });
  });

  it("drops the header when no IP can be trusted (one shared bucket)", () => {
    const request = new Request("http://localhost:3700/api/auth/get-session", { headers: { [CLIENT_IP_HEADER]: "1.2.3.4", "x-forwarded-for": "6.6.6.6" } });
    expect(withClientIp(request, { NODE_ENV: "production" }).headers.get(CLIENT_IP_HEADER)).toBeNull();
    expect(withClientIp(request, { VERCEL: "1" }).headers.get(CLIENT_IP_HEADER)).toBeNull();
    const vercel = new Request("http://x/api/auth/get-session", { headers: { "x-real-ip": "2001:db8::1" } });
    expect(withClientIp(vercel, { VERCEL: "1" }).headers.get(CLIENT_IP_HEADER)).toBe("2001:db8::1");
  });
});

describe("guardAuthRequest", () => {
  const verify = "http://localhost:3700/api/auth/magic-link/verify?token=abcdefghijklmnopqrstuvwxyz&callbackURL=%2Fdesigns";

  it("sends a magic link opened from outside the app to /login/confirm, without using it", () => {
    for (const site of ["cross-site", "none", "same-site"]) {
      const response = guardAuthRequest(new Request(verify, { headers: { "sec-fetch-site": site } }))!;
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/login/confirm?token=abcdefghijklmnopqrstuvwxyz&callbackURL=%2Fdesigns");
    }
    // A mail scanner (no Fetch Metadata, no confirmation) does not burn the token either.
    expect(guardAuthRequest(new Request(verify))!.status).toBe(303);
  });

  it("lets the confirm page's click through", () => {
    expect(guardAuthRequest(new Request(verify, { headers: { "sec-fetch-site": "same-origin" } }))).toBeNull();
    expect(guardAuthRequest(new Request(`${verify}&confirmed=1`))).toBeNull();
    // `confirmed=1` from another site does not skip the page.
    expect(guardAuthRequest(new Request(`${verify}&confirmed=1`, { headers: { "sec-fetch-site": "cross-site" } }))!.status).toBe(303);
  });

  it("refuses POSTs from other sites, cookies or not", () => {
    const post = (site?: string) =>
      guardAuthRequest(new Request("http://localhost:3700/api/auth/sign-in/anonymous", { method: "POST", headers: site ? { "sec-fetch-site": site } : {} }));
    expect(post("cross-site")?.status).toBe(403);
    expect(post("same-site")?.status).toBe(403);
    expect(post("same-origin")).toBeNull();
    // Server-to-server calls (no Fetch Metadata) go on to Better Auth's own checks.
    expect(post()).toBeNull();
  });
});
