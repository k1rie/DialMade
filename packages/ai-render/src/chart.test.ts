import { describe, expect, it } from "vitest";
import { inlineAssets } from "./export";
import { CHART_KINDS, canonicalChartValues, chartFromAttributes, chartSvg, formatChartValue, parseChartLabels, parseChartUnit, parseChartValues } from "./chart";
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
    expect(chartSvg("bar", [[3, 5]], "x")).not.toMatch(/<rect[^>]*opacity/);
    // The stressed value is said in a bubble.
    expect(bars).toMatch(/<rect[^>]*rx="10"/);
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

describe("chart details: axis, legend, values, unit", () => {
  const attrs = (map: Record<string, string>) => (name: string) => map[name] ?? null;

  it("reads labels, legend names and units, and refuses anything else", () => {
    expect(parseChartLabels("Jan, Feb,Mar")).toEqual(["Jan", "Feb", "Mar"]);
    expect(parseChartLabels("Sem. 1,Sem. 2,Ene 2026")).toEqual(["Sem. 1", "Sem. 2", "Ene 2026"]);
    for (const raw of ["Jan", "<b>,x", "a,,b", "this label is far too long,b", "a\"b,c", "(x),y"]) expect(parseChartLabels(raw), raw).toBeNull();
    expect(parseChartLabels("In", 1, 3)).toEqual(["In"]);
    for (const unit of ["€", "$", "%", "h", "min", "kg"]) expect(parseChartUnit(unit), unit).toBe(unit);
    for (const unit of ["", "€€", "euros", "<", "1"]) expect(parseChartUnit(unit), unit).toBeNull();
  });

  it("formats numbers the way each language reads them", () => {
    expect(formatChartValue(1840, "€", "en")).toBe("€1,840");
    expect(formatChartValue(18_500, "€", "es")).toBe("18,5k €");
    expect(formatChartValue(1_250_000, "$", "en")).toBe("$1.3M");
    expect(formatChartValue(96, "%")).toBe("96%");
    expect(formatChartValue(12, "h")).toBe("12 h");
    expect(formatChartValue(2.5)).toBe("2.5");
  });

  it("draws the x axis, the legend, bar values and ticks as text that never stretches", () => {
    const svg = chartFromAttributes(attrs({ "data-chart": "bar", "data-values": "4,6,5,9;3,4,4,5", "data-labels": "Jan,Feb,Mar,Apr", "data-series": "In,Out", "data-unit": "€" }), "Cash")!;
    for (const text of [">Jan<", ">Apr<", ">In<", ">Out<"]) expect(svg).toContain(text);
    // Text lives outside the stretched plot (the inner svg with preserveAspectRatio="none").
    const plot = /<svg[^>]*preserveAspectRatio="none"[^>]*>([\s\S]*?)<\/svg>/.exec(svg)![1]!;
    expect(plot).not.toContain("<text");
    // One bar series of 8 or fewer: each bar says its value.
    expect(chartFromAttributes(attrs({ "data-chart": "bar", "data-values": "4,6,5", "data-unit": "%" }), "x")).toContain(">6%<");
  });

  it("ignores extras that do not fit the data, and escapes what it prints", () => {
    const svg = chartFromAttributes(attrs({ "data-chart": "line", "data-values": "1,2,3", "data-labels": "Mon,Tue", "data-series": "In,Out" }), "Trend")!;
    expect(svg).not.toContain(">Mon<");
    expect(svg).not.toContain(">In<");
    expect(chartFromAttributes(attrs({ "data-chart": "line", "data-values": "1,2" }), "x")).toBeTruthy();
    expect(chartFromAttributes(attrs({ "data-chart": "pie", "data-values": "1,2" }), "x")).toBeNull();
    expect(chartSvg("line", [[1, 2, 3]], "x", 0, { labels: ["A&B", "C", "D"] })).toContain("A&amp;B · 1");
  });

  it("puts the total, or the stressed share and its name, in a donut", () => {
    expect(chartSvg("donut", [[50, 30, 20]], "x", null, { unit: "€" })).toContain(">€100<");
    expect(chartSvg("donut", [[50, 30, 20]], "x", 1, { labels: ["Rent", "Food", "Fun"] })).toMatch(/>30%<[\s\S]*>Food</);
  });

  it("survives the sanitizer only when the extras match the numbers", () => {
    expect(sanitized('<img data-chart="bar" data-values="1,2,3" data-labels="a,b,c" data-unit="€" alt="x">')).toMatch(/data-labels="a,b,c"[\s\S]*data-unit="€"|data-unit="€"[\s\S]*data-labels="a,b,c"/);
    expect(sanitized('<img data-chart="bar" data-values="1,2,3" data-labels="a,b" alt="x">')).not.toContain("data-labels");
    expect(sanitized('<img data-chart="bar" data-values="1,2;3,4" data-series="In,Out" alt="x">')).toContain('data-series="In,Out"');
    expect(sanitized('<img data-chart="bar" data-values="1,2" data-series="In,Out" alt="x">')).not.toContain("data-series");
    expect(sanitized('<img data-chart="donut" data-values="5,3,2" data-labels="a,b,c" alt="x">')).toContain("data-labels");
    expect(sanitized('<img data-labels="a,b" data-unit="€" alt="x">')).not.toMatch(/data-labels|data-unit/);
    expect(sanitized('<div data-unit="€"></div>')).not.toContain("data-unit");
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
