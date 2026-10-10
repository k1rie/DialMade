import { describe, expect, it } from "vitest";
import { deltaE, hueDelta, normalizeColor, tokenColor } from "./color";

describe("normalizeColor", () => {
  it("keeps alpha and reports what is not a color", () => {
    expect(normalizeColor("oklch(1 0 0 / 10%)")).toMatchObject({ ok: true, color: { hex: "#ffffff", alpha: 0.1 } });
    expect(normalizeColor("hsl(222.2 84% 4.9%)")).toMatchObject({ ok: true, color: { hex: "#020817" } });
    expect(normalizeColor("#3A5BD9FF")).toEqual({ ok: true, color: expect.not.objectContaining({ alpha: expect.anything() }) });
    expect(normalizeColor("transparent")).toMatchObject({ ok: false, problem: "non-color" });
    expect(normalizeColor("currentColor")).toMatchObject({ ok: false, problem: "non-color" });
    expect(normalizeColor("rgb(0 0 0 / 0)")).toMatchObject({ ok: false, problem: "transparent" });
    expect(normalizeColor("var(--primary)")).toMatchObject({ ok: false, problem: "unresolved" });
    expect(normalizeColor("color-mix(in oklab, red 50%, blue)")).toMatchObject({ ok: false, problem: "unresolved" });
    expect(normalizeColor("oklch(from red l c h)")).toMatchObject({ ok: false, problem: "unresolved" });
    expect(normalizeColor("222.2 84% 4.9%")).toMatchObject({ ok: false, problem: "invalid-color" });
    expect(normalizeColor("x".repeat(1000))).toMatchObject({ ok: false, problem: "invalid-color" });
    for (const word of ["bad", "fade", "cafe", "600", "ffaadd"]) expect(normalizeColor(word)).toMatchObject({ ok: false, problem: "invalid-color" });
    expect(normalizeColor("#fade")).toMatchObject({ ok: true });
  });

  it("writes token colors and measures ΔEok", () => {
    expect(tokenColor({ hex: "#ffffff", alpha: 0.1 })).toBe("#ffffff1a");
    expect(tokenColor({ hex: "#ffffff" })).toBe("#ffffff");
    expect(deltaE("#3a5bd9", "#3a5bd9ff")).toBe(0);
    expect(deltaE("#000000", "#ffffff")).toBeCloseTo(1, 2);
    expect(hueDelta(350, 10)).toBe(20);
  });
});
