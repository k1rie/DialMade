import { describe, expect, it } from "vitest";
import { drawAssets, insertBlock } from "./insert";

describe("island second wall", () => {
  it("copies only allowed tags and attributes (template path)", () => {
    const host = document.createElement("div");
    insertBlock(host, '<section class="p-4" data-block-id="b"><p onclick="x()" style="color:red" data-dl-t="0">Hola</p><a href="javascript:alert(1)">x</a><a href="#screen:s-2">y</a><script>alert(1)</script><iframe></iframe></section>');
    expect(host.innerHTML).toBe('<section class="p-4" data-block-id="b"><p data-dl-t="0">Hola</p><a>x</a><a href="#screen:s-2">y</a></section>');
  });

  it("draws icons and placeholders as inline SVG with the image's classes and alt", () => {
    const host = document.createElement("div");
    host.innerHTML = '<i data-icon="check" class="size-4"></i><img class="w-full" data-placeholder="avatar" alt="Ana">';
    drawAssets(host);
    expect(host.querySelector("i svg")).not.toBeNull();
    const svg = host.querySelector("svg[data-placeholder]")!;
    expect(svg.getAttribute("class")).toBe("w-full");
    expect(svg.getAttribute("aria-label")).toBe("Ana");
    expect(host.querySelector("img")).toBeNull();
  });

  it("draws a chart from its numbers, and validates them again (second wall)", () => {
    const host = document.createElement("div");
    host.innerHTML =
      '<img class="h-40 w-full" data-chart="bar" data-values="3,5,2;1,2,1" data-placeholder="chart" alt="Ventas">' +
      '<img class="h-40 w-full" data-chart="radar" data-values="3,5,2" data-placeholder="chart" alt="No kind">' +
      '<img class="h-40 w-full" data-chart="line" data-values="3,&lt;script&gt;,2" data-placeholder="chart" alt="Bad numbers">';
    drawAssets(host);
    const svgs = Array.from(host.querySelectorAll("svg[data-placeholder]"));
    expect(svgs).toHaveLength(3);
    // The valid chart: bars, grouped by series.
    expect(svgs[0]!.querySelectorAll("rect").length).toBe(6);
    expect(svgs[0]!.getAttribute("aria-label")).toBe("Ventas");
    // The unknown kind and the bad numbers fall back to the placeholder art (12 chart-colored bars), never to the data.
    for (const fallback of svgs.slice(1)) expect(fallback.querySelectorAll("rect").length).toBe(13);
    expect(host.querySelector("script")).toBeNull();
  });

  it("keeps data-chart and data-values through the template path", () => {
    const host = document.createElement("div");
    insertBlock(host, '<section data-block-id="b"><img data-chart="area" data-values="1,2,3" data-placeholder="chart" alt="x" class="h-24 w-full"></section>');
    expect(host.querySelector("svg path")).not.toBeNull();
    expect(host.querySelector("img")).toBeNull();
  });

  it("draws the axis labels and the unit, re-checked by the second wall", () => {
    const host = document.createElement("div");
    insertBlock(host, '<section data-block-id="b"><img data-chart="bar" data-values="4,6,5" data-labels="Jan,Feb,Mar" data-unit="%" data-placeholder="chart" alt="x" class="h-24 w-full"></section>');
    const texts = Array.from(host.querySelectorAll("svg text")).map((text) => text.textContent);
    expect(texts).toEqual(expect.arrayContaining(["Jan", "Mar", "6%"]));
    // A label the sanitizer would refuse is ignored here too (the chart is still drawn).
    insertBlock(host, '<section data-block-id="b"><img data-chart="bar" data-values="4,6,5" data-labels="<b>,x,y" data-placeholder="chart" alt="x"></section>');
    expect(host.querySelector("svg rect")).not.toBeNull();
    expect(Array.from(host.querySelectorAll("svg text")).some((text) => text.textContent === "x")).toBe(false);
  });
});
