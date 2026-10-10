// Tests only: Better Auth + «Mis diseños» on an in-memory Postgres with the real migrations applied.
import { applyMigrations, createTestDatabase, type TestDatabase } from "@/lib/db/testing";
import { createDesignRepository } from "@/lib/designs/repository";
import { CLIENT_IP_HEADER, createAuth } from "./auth";
import type { AuthServerConfig } from "./config";
import type { EmailMessage, EmailSender } from "./email";

export const TEST_ORIGIN = "http://localhost:3700";

export function testAuthConfig(overrides: Partial<AuthServerConfig> = {}): AuthServerConfig {
  return {
    secret: "test-secret-0123456789-abcdefghijklmnop",
    baseURL: TEST_ORIGIN,
    trustedOrigins: [TEST_ORIGIN],
    production: false,
    github: null,
    google: null,
    email: { kind: "console" },
    passkey: { rpID: "localhost", rpName: "Dialmade", origin: TEST_ORIGIN },
    billing: null,
    ...overrides,
  };
}

export type TestAuth = Awaited<ReturnType<typeof createTestAuth>>;

export async function createTestAuth(overrides: Partial<AuthServerConfig> = {}) {
  const database: TestDatabase = await createTestDatabase();
  await applyMigrations(database);
  const outbox: EmailMessage[] = [];
  const email: EmailSender = { kind: "console", send: async (message) => void outbox.push(message) };
  const repo = createDesignRepository(database.db);
  const config = testAuthConfig(overrides);
  const auth = createAuth({ config, db: database.db, email, designs: repo });

  /** A browser: keeps cookies between calls, sends the app's Origin and one IP. */
  function browser(ip = "203.0.113.7") {
    const jar = new Map<string, string>();
    const cookieHeader = () => [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
    const remember = (response: Response) => {
      for (const line of response.headers.getSetCookie()) {
        const [pair] = line.split(";");
        const index = pair!.indexOf("=");
        const name = pair!.slice(0, index).trim();
        const value = pair!.slice(index + 1).trim();
        if (value === "" || /max-age=0/i.test(line)) jar.delete(name);
        else jar.set(name, value);
      }
      return response;
    };
    const request = (path: string, init: RequestInit & { json?: unknown; origin?: string | null } = {}) => {
      const headers = new Headers(init.headers);
      if (init.origin !== null) headers.set("origin", init.origin ?? TEST_ORIGIN);
      headers.set(CLIENT_IP_HEADER, ip);
      if (jar.size > 0) headers.set("cookie", cookieHeader());
      if (init.json !== undefined) headers.set("content-type", "application/json");
      const url = path.startsWith("http") ? path : `${TEST_ORIGIN}${path}`;
      return new Request(url, { ...init, headers, ...(init.json !== undefined && { body: JSON.stringify(init.json), method: init.method ?? "POST" }) });
    };
    return {
      jar,
      cookieHeader,
      request,
      /** Better Auth's handler, cookies kept. */
      call: async (path: string, init: Parameters<typeof request>[1] = {}) => remember(await auth.handler(request(path, init))),
      remember,
    };
  }

  /** The URL of the last magic link sent to `to`. */
  const lastLink = (to: string) => {
    const message = outbox.findLast((item) => item.to === to);
    const match = message?.text.match(/https?:\/\/\S+/);
    if (!match) throw new Error(`No magic link for ${to}`);
    return match[0];
  };

  return { database, db: database.db, auth, repo, outbox, browser, lastLink, config, close: database.close };
}
