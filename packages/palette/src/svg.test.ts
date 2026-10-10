import { describe, expect, it } from "vitest";
import { parseSvgColors } from "./svg";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- <rect fill="#999999"/> -->
  <style>
    .a { fill: #123456 }
    .b { stroke: hsl(120 100% 25%) !important; stroke-width: 2px }
    :root { --brand: #0F0; }
  </style>
  <defs>
    <linearGradient id="g">
      <stop offset="0" stop-color="#ABC"/>
      <stop offset="1" style="stop-color: rgb(255, 0, 0); stop-opacity: 1"/>
    </linearGradient>
  </defs>
  <rect fill="url(#g)" stroke="tomato" data-fill="#010203"/>
  <circle fill="none" stroke="currentColor" style="fill: rebeccapurple; stroke-width: 2"/>
  <path fill="#ff000080" stroke="transparent" fill-rule="evenodd"/>
  <path fill='#FFF'/>
  <text fill="rgb(255 0 0)" color="#00f">Hola</text>
</svg>`;

describe("parseSvgColors", () => {
  it("reads fill, stroke, style, <style>, stop-color, custom properties, named colors and rgb()", () => {
    expect(parseSvgColors(SVG)).toEqual([
      "#123456",
      "#008000",
      "#00ff00",
      "#aabbcc",
      "#ff0000",
      "#ff6347",
      "#663399",
      "#ffffff",
      "#0000ff",
    ]);
  });

  it("skips none, currentColor, transparent, url() refs, translucent colors and comments", () => {
    const colors = parseSvgColors(SVG);
    expect(colors).not.toContain("#999999");
    expect(colors).not.toContain("#010203");
    expect(colors.every((c) => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
  });

  it("keeps a fallback color after url()", () => {
    expect(parseSvgColors(`<path style="fill: url(#grad) #E2581A"/>`)).toEqual(["#e2581a"]);
  });

  it("returns an empty list when nothing is declared", () => {
    expect(parseSvgColors(`<svg><path d="M0 0h10v10z"/></svg>`)).toEqual([]);
  });
});
