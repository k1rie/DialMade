import { describe, expect, it } from "vitest";
import { contentContextFromDoc } from "../../context";
import type { RenderContext } from "../../types";
import { brandDoc } from "../testing/renderSection";
import { boardIndex, boardNumberOf, textOr } from "./board";
import { contrastRatio, contrastRows, contrastSummary, roleCssName } from "./contrast";
import { formatPx, formatRatio } from "./format";
import { brandSystem } from "./system";

describe("brand/lib", () => {
  it("contraste WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
    expect(roleCssName("primaryForeground")).toBe("primary-foreground");
    expect(roleCssName("chart3")).toBe("chart-3");
  });

  it("brandSystem cachea por doc y sus checks coinciden con theme.contrast", () => {
    const doc = brandDoc();
    const ctx: RenderContext = { ...contentContextFromDoc(doc), mode: "light", interactive: false, doc };
    const system = brandSystem(ctx)!;
    expect(brandSystem({ ...ctx, mode: "dark" })).toBe(system);
    expect(brandSystem({ ...ctx, doc: undefined })).toBeUndefined();
    const rows = contrastRows(system, "light");
    expect(rows).toHaveLength(system.theme.contrast.filter((check) => check.mode === "light").length);
    expect(contrastSummary(rows)).toEqual({ passed: rows.length, total: rows.length });
    expect(rows[0]).toMatchObject({ fgRole: "foreground", bgRole: "background" });
  });

  it("numeración del board e índice", () => {
    const doc = brandDoc();
    expect(boardIndex({ doc, locale: "en" }).map((entry) => `${entry.number} ${entry.label}`)).toEqual([
      "01 Identity",
      "02 Palette",
      "03 Typography",
      "04 Shape",
      "05 Components",
      "06 Art direction",
    ]);
    expect(boardNumberOf({ doc, locale: "es" }, "type-1", "brand.type")).toBe("03");
    expect(boardNumberOf({ locale: "es" }, "whatever", "brand.shape")).toBe("04");
    expect(boardNumberOf({ doc, locale: "es" }, "cover-1", "brand.cover")).toBeUndefined();
  });

  it("formatos", () => {
    expect(formatPx(16, "es")).toBe("16 px");
    expect(formatPx(56, "en", 34)).toBe("34–56 px");
    expect(formatRatio(4.5, "es")).toBe("4,5:1");
    expect(formatRatio(4.5, "en")).toBe("4.5:1");
    expect(textOr("  ", "x")).toBe("x");
  });
});
