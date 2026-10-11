import { beforeEach, describe, expect, it, vi } from "vitest";
import { FULL_ACCESS_USES_PER_MONTH, hasFullAccess } from "../fullAccess";
import { RenderSessionBodySchema } from "./api";
import { parseRenderRequest } from "./route";

vi.mock("../fullAccess", async (original) => ({ ...(await original<typeof import("../fullAccess")>()), hasFullAccess: vi.fn(async () => false) }));

const post = (body: unknown) =>
  new Request("http://localhost/api/ai/render/session", { method: "POST", headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: JSON.stringify(body) });

describe("«Acceso completo» on the render routes", () => {
  beforeEach(() => vi.mocked(hasFullAccess).mockResolvedValue(false));

  it("the free tier never picks the model or the finish: 400, before any ledger work", async () => {
    for (const body of [{ screens: 1, model: "claude-opus-5-5" }, { screens: 1, tier: "final" }]) {
      const parsed = await parseRenderRequest(post(body), RenderSessionBodySchema, "{ screens }");
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.response.status).toBe(400);
    }
  });

  it("without a choice the free tier runs its own model at «Maqueta»", async () => {
    const parsed = await parseRenderRequest(post({ screens: 1 }), RenderSessionBodySchema, "{ screens }");
    expect(parsed.ok && { tier: parsed.tier, full: parsed.caller?.fullAccess ?? false }).toEqual({ tier: "mockup", full: false });
  });

  it("a full-access account picks both, and gets its own limits (same budget)", async () => {
    vi.mocked(hasFullAccess).mockResolvedValue(true);
    const parsed = await parseRenderRequest(post({ screens: 3, model: "claude-opus-5-5", tier: "final" }), RenderSessionBodySchema, "{ screens }");
    if (!parsed.ok) throw new Error("refused");
    expect(parsed.caller?.fullAccess).toBe(true);
    expect(parsed.tier).toBe("final");
    expect(parsed.config.freeModel).toBe("claude-opus-5-5");
    expect(parsed.config.freeUsesPerMonth).toBeGreaterThanOrEqual(FULL_ACCESS_USES_PER_MONTH);
  });

  it("an unknown model is refused even with full access", async () => {
    vi.mocked(hasFullAccess).mockResolvedValue(true);
    const parsed = await parseRenderRequest(post({ screens: 1, model: "claude-fable-5-1" }), RenderSessionBodySchema, "{ screens }");
    expect(parsed.ok).toBe(false);
  });
});
