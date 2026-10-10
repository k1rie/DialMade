import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readDatabaseConfig } from "@/lib/db/database";
import { authAvailability, readAuthConfig } from "./config";
import { consoleSender, magicLinkEmail } from "./email";

const DB = "postgresql://postgres.ref:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";
const SECRET = "s".repeat(40);

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errors.mockRestore());

describe("readAuthConfig", () => {
  it("is off without a Postgres DATABASE_URL", () => {
    expect(readAuthConfig({})).toBeNull();
    expect(readAuthConfig({ DATABASE_URL: "https://ref.supabase.co" })).toBeNull();
    expect(authAvailability({})).toMatchObject({ enabled: false, magicLink: false, github: false });
  });

  it("development: console email, localhost:3700 trusted, a per-process secret", () => {
    const config = readAuthConfig({ DATABASE_URL: DB, NODE_ENV: "development" })!;
    expect(config.email).toEqual({ kind: "console" });
    expect(config.baseURL).toBe("http://localhost:3700");
    expect(config.trustedOrigins).toContain("http://localhost:3700");
    expect(config.secret.length).toBeGreaterThanOrEqual(32);
    // NEXT_PUBLIC_APP_URL may point at another local port: development follows BETTER_AUTH_URL or 3700.
    expect(readAuthConfig({ DATABASE_URL: DB, NEXT_PUBLIC_APP_URL: "http://localhost:3000" })!.baseURL).toBe("http://localhost:3700");
    expect(readAuthConfig({ DATABASE_URL: DB, BETTER_AUTH_URL: "http://localhost:4000" })!.baseURL).toBe("http://localhost:4000");
    expect(authAvailability({ DATABASE_URL: DB, NODE_ENV: "development" })).toMatchObject({ enabled: true, magicLink: true, devEmail: true, github: false, google: false });
  });

  it("production needs a secret, an https app URL and the database CA (or an explicit no-verify)", () => {
    const prod = { DATABASE_URL: DB, NODE_ENV: "production", DATABASE_SSL: "no-verify" };
    expect(readAuthConfig(prod)).toBeNull();
    expect(readAuthConfig({ ...prod, BETTER_AUTH_SECRET: "short", NEXT_PUBLIC_APP_URL: "https://dialmade.dev" })).toBeNull();
    expect(readAuthConfig({ ...prod, BETTER_AUTH_SECRET: SECRET, NEXT_PUBLIC_APP_URL: "http://dialmade.dev" })).toBeNull();
    const config = readAuthConfig({ ...prod, BETTER_AUTH_SECRET: SECRET, NEXT_PUBLIC_APP_URL: "https://dialmade.dev/" })!;
    expect(config.baseURL).toBe("https://dialmade.dev");
    expect(config.trustedOrigins).toEqual(["https://dialmade.dev"]);
    // No email transport in production: the magic link is «not configured», never printed.
    expect(config.email).toBeNull();
    expect(readDatabaseConfig({ DATABASE_URL: DB, NODE_ENV: "production" })).toBeNull();
  });

  it("picks Resend or SMTP only with a sender address", () => {
    const base = { DATABASE_URL: DB, NODE_ENV: "production", DATABASE_SSL: "no-verify", BETTER_AUTH_SECRET: SECRET, BETTER_AUTH_URL: "https://dialmade.dev" };
    expect(readAuthConfig({ ...base, RESEND_API_KEY: "re_x" })!.email).toBeNull();
    expect(readAuthConfig({ ...base, RESEND_API_KEY: "re_x", DIALMADE_EMAIL_FROM: "Dialmade <hola@dialmade.dev>" })!.email).toMatchObject({ kind: "resend" });
    expect(readAuthConfig({ ...base, SMTP_URL: "smtps://u:p@smtp.example:465", DIALMADE_EMAIL_FROM: "a@b.c" })!.email).toMatchObject({ kind: "smtp" });
  });

  it("OAuth providers only with both credentials; billing only when switched on with both Stripe keys", () => {
    const base = { DATABASE_URL: DB, NODE_ENV: "development" };
    expect(readAuthConfig({ ...base, GITHUB_CLIENT_ID: "id" })!.github).toBeNull();
    expect(readAuthConfig({ ...base, GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "s" })!.github).not.toBeNull();
    expect(authAvailability({ ...base, GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s" })).toMatchObject({ google: true, github: false });
    expect(readAuthConfig({ ...base, STRIPE_SECRET_KEY: "sk", STRIPE_WEBHOOK_SECRET: "wh" })!.billing).toBeNull();
    expect(readAuthConfig({ ...base, DIALMADE_FEATURE_BILLING: "true", STRIPE_SECRET_KEY: "sk" })!.billing).toBeNull();
    expect(readAuthConfig({ ...base, DIALMADE_FEATURE_BILLING: "true", STRIPE_SECRET_KEY: "sk", STRIPE_WEBHOOK_SECRET: "wh" })!.billing).not.toBeNull();
  });

  it("availability carries booleans only, never a secret", () => {
    const env = { DATABASE_URL: DB, NODE_ENV: "development", GITHUB_CLIENT_ID: "gh-id", GITHUB_CLIENT_SECRET: "gh-secret-value", BETTER_AUTH_SECRET: SECRET };
    const text = JSON.stringify(authAvailability(env));
    for (const value of ["gh-secret-value", "gh-id", SECRET, "pw", "pooler"]) expect(text).not.toContain(value);
    expect(Object.values(authAvailability(env)).every((value) => typeof value === "boolean")).toBe(true);
  });

  it("the database URL is never logged", () => {
    readDatabaseConfig({ DATABASE_URL: "mysql://user:hunter2@host/db" });
    readDatabaseConfig({ DATABASE_URL: "not a url hunter2" });
    expect(JSON.stringify(errors.mock.calls)).not.toContain("hunter2");
  });
});

describe("email", () => {
  it("the magic link email escapes the URL and follows the locale", () => {
    const es = magicLinkEmail("a@b.c", 'https://x.dev/v?token=a&b="<x>"', "es");
    expect(es.subject).toBe("Tu enlace para entrar en Dialmade");
    expect(es.html).not.toContain('"<x>"');
    expect(es.html).toContain("&amp;b=&quot;&lt;x&gt;&quot;");
    expect(magicLinkEmail("a@b.c", "https://x", "fr").subject).toBe("Tu enlace para entrar en Dialmade");
    expect(magicLinkEmail("a@b.c", "https://x", "en").subject).toBe("Your link to sign in to Dialmade");
  });

  it("development prints the link to the console", async () => {
    const lines: string[] = [];
    await consoleSender((line) => lines.push(line)).send(magicLinkEmail("a@b.c", "http://localhost:3700/api/auth/magic-link/verify?token=t"));
    expect(lines.join("\n")).toContain("http://localhost:3700/api/auth/magic-link/verify?token=t");
  });
});
