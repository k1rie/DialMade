import { describe, expect, it } from "vitest";
import { inlineAssets } from "./export";
import { CHART_KINDS, canonicalChartValues, chartSvg, parseChartValues } from "./chart";
import { sanitizeBlock } from "./sanitize";
import { blockToTsx } from "./tsx";
import { checkClass } from "./vocabulary";

const block = (inner: string) => `<section data-block-id="b-chart" class="@container">${inner}</section>`;
const sanitized = (inner: string) => {
  const result = sanitizeBlock(block(inner), { blockId: "b-chart", screenIds: [] });
  if (!result.ok) throw new Error(result.failure);
  return result.html;
};

describe("parseChartValues", () => {
  it("reads one or several series", () => {
    expect(parseChartValues("12,18,9")).toEqual([[12, 18, 9]]);
    expect(parseChartValues("12, 18.5 ,9;7,10,5")).toEqual([[12, 18.5, 9], [7, 10, 5]]);
    expect(canonicalChartValues([[12, 18.5, 9], [7, 10, 5]])).toBe("12,18.5,9;7,10,5");
  });

  it("rejects what is not plain, bounded numbers", () => {
    for (const raw of ["", "5", "1,2;3", "1,x,3", "1,-2,3", "1e9,2", "1,2,3;1,2,3;1,2,3;1,2,3", `${Array.from({ length: 25 }, () => 1).join(",")}`, "NaN,1", "<script>,1", "1,2,".repeat(100)]) {
      expect(parseChartValues(raw), raw).toBeNull();
    }
  });
});

describe("chartSvg", () => {
  const series = [[12, 18, 9, 22, 15, 30, 26]];

  it("draws every kind with theme tokens only", () => {
    for (const kind of CHART_KINDS) {
      const svg = chartSvg(kind, kind === "bar" ? [[3, 5], [2, 4]] : series, "Ingresos");
      expect(svg.startsWith("<svg "), kind).toBe(true);
      expect(svg).toContain("<title>Ingresos</title>");
      expect(svg).not.toMatch(/<script|on\w+=|href=|url\((?!#)/i);
      // Every color is a theme variable (the hex after the comma is only the var() fallback).
      const colors = [...svg.matchAll(/(?:fill|stroke|stop-color):([^;"]+)/g)].map((match) => match[1]!);
      for (const color of colors) expect(color, `${kind}: ${color}`).toMatch(/^(?:var\(--[a-z0-9-]+(?:, #[0-9a-f]{3,6})?\)|url\(#dlc[a-z0-9-]+\))$/);
    }
  });

  it("is deterministic and uses unique gradient ids per data", () => {
    expect(chartSvg("area", series)).toBe(chartSvg("area", series));
    const a = /id="(dlc[a-z0-9]+)-0"/.exec(chartSvg("area", series))?.[1];
    const b = /id="(dlc[a-z0-9]+)-0"/.exec(chartSvg("area", [[1, 2, 3]]))?.[1];
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it("escapes its accessible name", () => {
    expect(chartSvg("bar", series, '"><script>')).not.toContain("<script>");
  });
});

describe("<img data-chart> through the pipeline", () => {
  it("keeps a valid chart and marks it as a chart image", () => {
    const html = sanitized('<img data-chart="area" data-values="12, 18,9;7,10,5" alt="Ingresos" class="h-40 w-full">');
    expect(html).toContain('data-chart="area"');
    expect(html).toContain('data-values="12,18,9;7,10,5"');
    expect(html).toContain('data-placeholder="chart"');
  });

  it("drops a chart without numbers, numbers without a kind, and both on other tags", () => {
    expect(sanitized('<img data-chart="bar" alt="x">')).not.toContain("data-chart");
    expect(sanitized('<img data-values="1,2,3" alt="x">')).not.toContain("data-values");
    expect(sanitized('<img data-chart="radar" data-values="1,2,3" alt="x">')).not.toContain("data-chart");
    const div = sanitized('<div data-chart="bar" data-values="1,2,3"></div>');
    expect(div).not.toContain("data-chart");
    expect(div).not.toContain("data-values");
    expect(sanitized('<img data-chart="bar" data-values="1,<script>,3" alt="x">')).not.toContain("script");
  });

  it("is idempotent", () => {
    const once = sanitized('<img data-chart="line" data-values="1,2,3" alt="x" class="h-24 w-full">');
    const again = sanitizeBlock(once, { blockId: "b-chart", screenIds: [] });
    expect(again.ok && again.html).toBe(once);
  });

  it("is drawn by the HTML export and by the TSX export", () => {
    const html = sanitized('<img data-chart="bar" data-values="3,5,2" alt="Ventas" class="h-32 w-full">');
    const inlined = inlineAssets(html);
    expect(inlined).toContain("<svg");
    expect(inlined).toContain("<rect");
    expect(inlined).toContain('aria-label="Ventas"');
    const tsx = blockToTsx(html, "b-chart", { label: "Ventas" });
    expect(tsx).toContain("<svg");
    expect(tsx).toContain("className=\"h-32 w-full\"");
    expect(tsx).not.toContain("Placeholder");
  });
});

describe("data-highlight", () => {
  it("dims the other bars and marks a point of a line", () => {
    const bars = chartSvg("bar", [[3, 5, 2, 8]], "x", 3);
    expect(bars.match(/opacity="\.32"/g)).toHaveLength(3);
    const line = chartSvg("line", [[3, 5, 2, 8]], "x", 1);
    expect(line).toContain("stroke-dasharray");
    expect(chartSvg("bar", [[3, 5]], "x")).not.toContain("opacity");
  });

  it("is kept only on a chart image and only when the index exists in the data", () => {
    expect(sanitized('<img data-chart="bar" data-values="1,2,3" data-highlight="2" alt="x">')).toContain('data-highlight="2"');
    expect(sanitized('<img data-chart="bar" data-values="1,2,3" data-highlight="3" alt="x">')).not.toContain("data-highlight");
    expect(sanitized('<img data-chart="bar" data-values="1,2,3" data-highlight="-1" alt="x">')).not.toContain("data-highlight");
    expect(sanitized('<img data-highlight="1" alt="x">')).not.toContain("data-highlight");
    expect(sanitized('<div data-highlight="1"></div>')).not.toContain("data-highlight");
  });

  it("reaches the HTML and TSX exports", () => {
    const html = sanitized('<img data-chart="bar" data-values="3,5,2,8" data-highlight="3" alt="Ventas" class="h-32 w-full">');
    expect(inlineAssets(html)).toContain('opacity=".32"');
    expect(blockToTsx(html, "b-chart", { label: "Ventas" })).toContain("opacity");
  });
});

describe("single-side borders (dividers)", () => {
  it("are part of the vocabulary", () => {
    for (const token of ["border-b", "border-t", "border-l", "border-r", "border-x", "border-y", "border-b-2", "border-t border-border", "last:border-b-0", "@3xl:border-l"]) {
      for (const part of token.split(" ")) expect(checkClass(part).ok, part).toBe(true);
    }
    expect(checkClass("border-b-red-500").ok).toBe(false);
  });
});
