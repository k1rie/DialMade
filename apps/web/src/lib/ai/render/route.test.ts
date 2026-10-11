import { beforeEach, describe, expect, it, vi } from "vitest";
import { FULL_ACCESS_USES_PER_MONTH, hasFullAccess } from "../fullAccess";
import { MAX_RENDER_BODY_BYTES, MAX_RENDER_DIRECTION_BODY_BYTES, RenderRequestBodySchema, RenderSessionBodySchema, StyleReferenceSchema, carriesReferences } from "./api";
import { parseRenderRequest, type RenderRequestLimits } from "./route";

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

  it("a full-access account picks the finish, the finish decides the model, and it gets its own limits (same budget)", async () => {
    vi.mocked(hasFullAccess).mockResolvedValue(true);
    const parsed = await parseRenderRequest(post({ screens: 3, model: "claude-haiku-5-5", tier: "presentable" }), RenderSessionBodySchema, "{ screens }");
    if (!parsed.ok) throw new Error("refused");
    expect(parsed.caller?.fullAccess).toBe(true);
    expect(parsed.tier).toBe("presentable");
    expect(parsed.config.freeModel).toBe("claude-sonnet-5-5");
    expect(parsed.config.freeUsesPerMonth).toBeGreaterThanOrEqual(FULL_ACCESS_USES_PER_MONTH);
    // «Producto final» is the developer's agent; a call that still asks for it runs as Presentable.
    const final = await parseRenderRequest(post({ screens: 1, model: "claude-opus-5-5", tier: "final" }), RenderSessionBodySchema, "{ screens }");
    expect(final.ok && final.config.freeModel).toBe("claude-sonnet-5-5");
    // Without a finish, the model a full-access account picked still counts.
    const picked = await parseRenderRequest(post({ screens: 1, model: "claude-opus-5-5" }), RenderSessionBodySchema, "{ screens }");
    expect(picked.ok && picked.config.freeModel).toBe("claude-opus-5-5");
  });

  it("an unknown model is refused even with full access", async () => {
    vi.mocked(hasFullAccess).mockResolvedValue(true);
    const parsed = await parseRenderRequest(post({ screens: 1, model: "claude-fable-5-1" }), RenderSessionBodySchema, "{ screens }");
    expect(parsed.ok).toBe(false);
  });
});

describe("body caps and the reference screenshots of «Estilo»", () => {
  const limits: RenderRequestLimits = { maxBytes: MAX_RENDER_DIRECTION_BODY_BYTES, mayExceedDefault: carriesReferences };
  const status = async (body: unknown) => {
    const parsed = await parseRenderRequest(post(body), RenderRequestBodySchema, "{ task }", limits);
    return parsed.ok ? 200 : parsed.response.status;
  };
  const pad = (bytes: number) => "x".repeat(bytes);

  it("the larger cap fits Vercel's 4.5 MB request limit and holds three screenshots", () => {
    expect(MAX_RENDER_DIRECTION_BODY_BYTES).toBeLessThan(4.5 * 1024 * 1024);
    expect(MAX_RENDER_DIRECTION_BODY_BYTES).toBeGreaterThan(MAX_RENDER_BODY_BYTES + 3 * 900 * 1024);
  });

  it("a direction body over 128 KB passes the size gate (a schema error is a 400, never a 413)", async () => {
    expect(await status({ task: "direction", pad: pad(MAX_RENDER_BODY_BYTES + 50_000) })).toBe(400);
  });

  it("any other task keeps the 128 KB cap, whatever the route's larger cap", async () => {
    for (const task of ["screen", "block", "unknown"]) expect(await status({ task, pad: pad(MAX_RENDER_BODY_BYTES + 50_000) }), task).toBe(413);
  });

  it("nothing passes the larger cap either", async () => {
    expect(await status({ task: "direction", pad: pad(MAX_RENDER_DIRECTION_BODY_BYTES + 1_000) })).toBe(413);
  });

  it("a body under the default cap is untouched by the larger one", async () => {
    expect(await status({ task: "screen", pad: pad(1_000) })).toBe(400);
  });

  it("the screenshot schema takes a JPEG base64 and nothing else", () => {
    expect(StyleReferenceSchema.safeParse({ mediaType: "image/jpeg", data: "QUJD" }).success).toBe(true);
    expect(StyleReferenceSchema.safeParse({ mediaType: "image/png", data: "QUJD" }).success).toBe(false);
    expect(StyleReferenceSchema.safeParse({ mediaType: "image/jpeg", data: "not base64 !" }).success).toBe(false);
    expect(StyleReferenceSchema.safeParse({ mediaType: "image/jpeg", data: "QUJD", url: "https://example.com/a.jpg" }).success).toBe(false);
    expect(StyleReferenceSchema.safeParse({ mediaType: "image/jpeg", data: "A".repeat(2_000_000) }).success).toBe(false);
  });
});
