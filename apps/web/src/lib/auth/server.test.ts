import { describe, expect, it } from "vitest";
import { CLIENT_IP_HEADER } from "./auth";
import { withClientIp } from "./server";

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
