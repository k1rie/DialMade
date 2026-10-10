import { sql } from "kysely";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleDoc } from "@/lib/ai/testing";
import { prepareDesign } from "@/lib/designs/serialize";
import { createTestAuth, TEST_ORIGIN, type TestAuth } from "./testing";

let t: TestAuth;
beforeEach(async () => {
  t = await createTestAuth();
});
afterEach(async () => {
  await t.close();
});

const prepared = () => {
  const result = prepareDesign(sampleDoc(["landing"]));
  if (!result.ok) throw new Error(result.message);
  return result.design;
};

async function signInWithMagicLink(browser: ReturnType<TestAuth["browser"]>, email: string, callbackURL = "/designs") {
  const sent = await browser.call("/api/auth/sign-in/magic-link", { json: { email, callbackURL, metadata: { locale: "en" } } });
  expect(sent.status).toBe(200);
  const verified = await browser.call(t.lastLink(email), { method: "GET", origin: null });
  return verified;
}

async function session(browser: ReturnType<TestAuth["browser"]>) {
  const response = await browser.call("/api/auth/get-session", { method: "GET", origin: null });
  return (await response.json()) as { user: { id: string; email: string; isAnonymous?: boolean | null } } | null;
}

describe("magic link", () => {
  it("signs in through the emailed link and lands on the callback path", async () => {
    const browser = t.browser();
    const verified = await signInWithMagicLink(browser, "ada@example.com", "/designs?from=save");
    expect(verified.status).toBe(302);
    expect(verified.headers.get("location")).toBe(`${TEST_ORIGIN}/designs?from=save`);
    const current = await session(browser);
    expect(current?.user.email).toBe("ada@example.com");
    expect(current?.user.isAnonymous).toBeFalsy();
    // The email is in the locale of the form and carries the link once.
    const message = t.outbox.at(-1)!;
    expect(message.subject).toBe("Your link to sign in to Dialmade");
    expect(message.html).toContain(t.lastLink("ada@example.com").replace(/&/g, "&amp;"));
  });

  it("stores the token hashed and lets it be used once", async () => {
    const browser = t.browser();
    await browser.call("/api/auth/sign-in/magic-link", { json: { email: "ada@example.com", callbackURL: "/" } });
    const link = t.lastLink("ada@example.com");
    const token = new URL(link).searchParams.get("token")!;
    const rows = await sql<{ identifier: string }>`select identifier from dialmade_auth.verification`.execute(t.db);
    expect(rows.rows.some((row) => row.identifier.includes(token))).toBe(false);
    expect((await browser.call(link, { method: "GET", origin: null })).headers.get("location")).toBe(`${TEST_ORIGIN}/`);
    const again = await t.browser("203.0.113.8").call(link, { method: "GET", origin: null });
    expect(again.headers.get("location")).toMatch(/error=/);
  });

  it("refuses callback URLs on other origins (open redirect)", async () => {
    const browser = t.browser();
    for (const callbackURL of ["https://evil.example/steal", "//evil.example/x", "/\\evil.example", "javascript:alert(1)"]) {
      const response = await browser.call("/api/auth/sign-in/magic-link", { json: { email: "ada@example.com", callbackURL } });
      expect(response.status, callbackURL).toBe(403);
    }
    expect(t.outbox).toHaveLength(0);
  });

  it("refuses a sign-in request from another origin (CSRF)", async () => {
    const browser = t.browser();
    const response = await browser.call("/api/auth/sign-in/magic-link", { json: { email: "ada@example.com" }, origin: "https://evil.example" });
    expect(response.status).toBe(403);
    expect(t.outbox).toHaveLength(0);
  });

  it("limits links per email address even across IPs", async () => {
    for (let i = 0; i < 5; i += 1) {
      const response = await t.browser(`198.51.100.${i + 1}`).call("/api/auth/sign-in/magic-link", { json: { email: "victim@example.com" } });
      expect(response.status).toBe(200);
    }
    const sixth = await t.browser("198.51.100.99").call("/api/auth/sign-in/magic-link", { json: { email: "Victim@Example.com" } });
    expect(sixth.status).toBe(429);
    expect(t.outbox).toHaveLength(5);
    const stored = await sql<{ key: string }>`select key from dialmade.rate_limits`.execute(t.db);
    expect(JSON.stringify(stored.rows)).not.toContain("victim");
  });
});

describe("email quota", () => {
  it("stops at the daily cap for the whole app", async () => {
    const { takeMagicLinkSend } = await import("./emailThrottle");
    const limits = { perEmail: 5, perDay: 3 };
    const results = [];
    for (let i = 0; i < 4; i += 1) results.push(await takeMagicLinkSend(t.db, `user${i}@example.com`, t.config.secret, limits));
    expect(results).toEqual([true, true, true, false]);
  });
});

describe("rate limit per IP", () => {
  it("groups IPv6 addresses by /56, so rotating addresses inside one site does not reset it", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const response = await t.browser(`2001:db8:1:${(i + 1).toString(16)}::${(i + 1).toString(16)}`).call("/api/auth/sign-in/magic-link", { json: { email: `user${i}@example.com` } });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
    // Another /56 has its own bucket.
    const other = await t.browser("2001:db8:2::1").call("/api/auth/sign-in/magic-link", { json: { email: "other@example.com" } });
    expect(other.status).toBe(200);
  });

  it("limits anonymous devices per IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) statuses.push((await t.browser("192.0.2.10").call("/api/auth/sign-in/anonymous", { method: "POST" })).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });
});

describe("cookies", () => {
  it("are httpOnly, SameSite=Lax and prefixed; Secure in production", async () => {
    const response = await t.browser().call("/api/auth/sign-in/anonymous", { method: "POST" });
    const cookie = response.headers.getSetCookie().find((line) => line.includes("session_token"))!;
    expect(cookie).toMatch(/^dialmade\.session_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/Secure/i);

    const prod = await createTestAuth({ production: true, baseURL: "https://dialmade.example", trustedOrigins: ["https://dialmade.example"] });
    try {
      const secure = await prod.auth.handler(
        new Request("https://dialmade.example/api/auth/sign-in/anonymous", { method: "POST", headers: { origin: "https://dialmade.example", "x-dialmade-client-ip": "192.0.2.1" } }),
      );
      const line = secure.headers.getSetCookie().find((item) => item.includes("session_token"))!;
      expect(line).toMatch(/^__Secure-dialmade\.session_token=/);
      expect(line).toMatch(/Secure/i);
    } finally {
      await prod.close();
    }
  });
});

describe("anonymous device → account", () => {
  it("moves the device's designs to the account and removes the anonymous user", async () => {
    const browser = t.browser();
    const anon = await browser.call("/api/auth/sign-in/anonymous", { method: "POST" });
    expect(anon.status).toBe(200);
    const anonUser = (await session(browser))!.user;
    expect(anonUser.isAnonymous).toBe(true);
    await t.repo.create(anonUser.id, "Brisa", prepared(), { maxDesigns: 20, maxBytes: 3_000_000 });
    await t.repo.create(anonUser.id, "Brisa 2", prepared(), { maxDesigns: 20, maxBytes: 3_000_000 });

    const verified = await signInWithMagicLink(browser, "ada@example.com", "/?resume=save");
    expect(verified.status).toBe(302);
    const account = (await session(browser))!.user;
    expect(account.isAnonymous).toBeFalsy();
    expect(account.id).not.toBe(anonUser.id);

    expect((await t.repo.list(account.id)).map((design) => design.name).sort()).toEqual(["Brisa", "Brisa 2"]);
    expect(await t.repo.list(anonUser.id)).toEqual([]);
    const left = await sql<{ id: string }>`select id from dialmade_auth."user" where id = ${anonUser.id}`.execute(t.db);
    expect(left.rows).toEqual([]);
  });

  it("joins an existing account: its designs and the device's end up together", async () => {
    const first = t.browser("192.0.2.20");
    await signInWithMagicLink(first, "ada@example.com", "/");
    const accountId = (await session(first))!.user.id;
    await t.repo.create(accountId, "Old", prepared(), { maxDesigns: 200, maxBytes: 25_000_000 });

    const device = t.browser("192.0.2.21");
    await device.call("/api/auth/sign-in/anonymous", { method: "POST" });
    const anonId = (await session(device))!.user.id;
    await t.repo.create(anonId, "From device", prepared(), { maxDesigns: 20, maxBytes: 3_000_000 });
    await signInWithMagicLink(device, "ada@example.com", "/");

    expect((await session(device))!.user.id).toBe(accountId);
    expect((await t.repo.list(accountId)).map((design) => design.name).sort()).toEqual(["From device", "Old"]);
  });
});

describe("someone else's magic link (login CSRF)", () => {
  it("signs the visitor in but never hands the device's designs to that account", async () => {
    // The attacker asks for a link to their own email, from their own browser.
    const attacker = t.browser("198.51.100.50");
    await attacker.call("/api/auth/sign-in/magic-link", { json: { email: "mallory@example.com", callbackURL: "/" } });
    const link = t.lastLink("mallory@example.com");

    // The victim saves on this device without an account, then opens the attacker's link.
    const victim = t.browser("192.0.2.77");
    await victim.call("/api/auth/sign-in/anonymous", { method: "POST" });
    const victimAnon = (await session(victim))!.user.id;
    await t.repo.create(victimAnon, "Secreto", prepared(), { maxDesigns: 20, maxBytes: 3_000_000 });
    await victim.call(link, { method: "GET", origin: null });

    const mallory = await sql<{ id: string }>`select id from dialmade_auth."user" where email = 'mallory@example.com'`.execute(t.db);
    expect(await t.repo.list(mallory.rows[0]!.id)).toEqual([]);
    // The anonymous user and its design are left alone (the purge removes them later).
    expect((await t.repo.list(victimAnon)).map((design) => design.name)).toEqual(["Secreto"]);
  });

  it("the emailed link carries its email, signed with the token", async () => {
    await t.browser().call("/api/auth/sign-in/magic-link", { json: { email: "Ada@Example.com" } });
    const url = new URL(t.lastLink("Ada@Example.com"));
    const { verifyMagicLinkSignature } = await import("./magicLink");
    expect(url.searchParams.get("email")?.toLowerCase()).toBe("ada@example.com");
    expect(verifyMagicLinkSignature(t.config.secret, url.searchParams.get("token")!, "ada@example.com", url.searchParams.get("sig")!)).toBe(true);
    expect(verifyMagicLinkSignature(t.config.secret, url.searchParams.get("token")!, "eve@example.com", url.searchParams.get("sig")!)).toBe(false);
  });
});

describe("passkeys and unverified accounts", () => {
  it("an anonymous device cannot register a passkey", async () => {
    const browser = t.browser();
    await browser.call("/api/auth/sign-in/anonymous", { method: "POST" });
    const response = await browser.call("/api/auth/passkey/generate-register-options", { method: "GET" });
    expect(response.status).toBe(403);
  });

  it("an account with a verified email can", async () => {
    const browser = t.browser();
    await signInWithMagicLink(browser, "ada@example.com", "/");
    const response = await browser.call("/api/auth/passkey/generate-register-options", { method: "GET" });
    expect(response.status).toBe(200);
  });

  it("no account is created with an unverified email", async () => {
    const context = await t.auth.$context;
    const created = await context.internalAdapter.createUser({ email: "eve@example.com", name: "Eve", emailVerified: false }, { method: "oauth", oauth: { providerId: "github", profile: {} } } as never).catch(() => null);
    expect(created).toBeFalsy();
    const rows = await sql<{ id: string }>`select id from dialmade_auth."user" where email = 'eve@example.com'`.execute(t.db);
    expect(rows.rows).toEqual([]);
  });
});

describe("providers", () => {
  it("GitHub and Google are off without credentials", async () => {
    const response = await t.browser().call("/api/auth/sign-in/social", { json: { provider: "github", callbackURL: "/" } });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("an OAuth sign-in refuses a callback on another origin", async () => {
    const withGithub = await createTestAuth({ github: { clientId: "id", clientSecret: "secret" } });
    try {
      const browser = withGithub.browser();
      const evil = await browser.call("/api/auth/sign-in/social", { json: { provider: "github", callbackURL: "https://evil.example" } });
      expect(evil.status).toBe(403);
      const ok = await browser.call("/api/auth/sign-in/social", { json: { provider: "github", callbackURL: "/designs" } });
      expect(ok.status).toBe(200);
      const { url } = (await ok.json()) as { url: string };
      expect(new URL(url).hostname).toBe("github.com");
      expect(new URL(url).searchParams.get("redirect_uri")).toBe(`${TEST_ORIGIN}/api/auth/callback/github`);
    } finally {
      await withGithub.close();
    }
  });
});

describe("billing", () => {
  it("the Stripe plugin is not loaded unless configured", () => {
    const ids = (t.auth.options.plugins ?? []).map((plugin) => plugin.id);
    expect(ids).toEqual(expect.arrayContaining(["magic-link", "anonymous", "passkey"]));
    expect(ids).not.toContain("stripe");
  });
});

vi.setConfig({ testTimeout: 30_000 });
