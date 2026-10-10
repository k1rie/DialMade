import { describe, expect, it, vi } from "vitest";
import { OFFLINE_AI_STATUS } from "@/lib/ai/policy";
import { BLOCKED_MESSAGE, installFetchGuard } from "./fetchGuard";

function setup() {
  const original = vi.fn<typeof fetch>(async () => new Response("asset"));
  const target = { fetch: original, location: { href: "http://localhost:3710/promo?scene=preview", origin: "http://localhost:3710" } };
  const restore = installFetchGuard(target);
  return { target, original, restore };
}

describe("installFetchGuard", () => {
  it("answers the AI status with the fixed «AI off» status", async () => {
    const { target, original } = setup();
    const response = await target.fetch("/api/ai/status", { cache: "no-store" });
    expect(await response.json()).toEqual(OFFLINE_AI_STATUS);
    expect(original).not.toHaveBeenCalled();
  });

  it("refuses any other API call and any other origin", async () => {
    const { target, original } = setup();
    await expect(target.fetch("/api/ai/copy", { method: "POST" })).rejects.toThrow(BLOCKED_MESSAGE);
    await expect(target.fetch(new URL("https://example.supabase.co/rest/v1/x"))).rejects.toThrow(BLOCKED_MESSAGE);
    await expect(target.fetch(new Request("https://api.anthropic.com/v1/messages"))).rejects.toThrow(BLOCKED_MESSAGE);
    expect(original).not.toHaveBeenCalled();
  });

  it("lets the app's own assets and blob URLs through", async () => {
    const { target, original } = setup();
    await target.fetch("/samples/brisa.svg");
    await target.fetch("blob:http://localhost:3710/0b6c");
    expect(original).toHaveBeenCalledTimes(2);
  });

  it("restores the original fetch", () => {
    const { target, original, restore } = setup();
    restore();
    expect(target.fetch).toBe(original);
  });
});
