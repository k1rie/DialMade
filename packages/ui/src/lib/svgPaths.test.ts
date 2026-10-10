import { describe, expect, it } from "vitest";
import { areaPath, barPath, linearPath, monotonePath } from "./svgPaths";

describe("svgPaths", () => {
  it("linearPath une puntos con rectas", () => {
    expect(linearPath([[0, 0], [10, 5]])).toBe("M0,0L10,5");
  });

  it("monotonePath no sobrepasa los extremos en una serie monótona", () => {
    const d = monotonePath([[0, 10], [10, 8], [20, 2], [30, 0]]);
    const numbers = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    const ys = numbers.filter((_, i) => i % 2 === 1);
    expect(Math.max(...ys)).toBeLessThanOrEqual(10);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(d.startsWith("M0,10C")).toBe(true);
  });

  it("areaPath cierra contra la base", () => {
    expect(areaPath("M0,0L10,5", [[0, 0], [10, 5]], 20)).toBe("M0,0L10,5L10,20L0,20Z");
  });

  it("barPath redondea el extremo según el signo", () => {
    expect(barPath(0, 10, 100, 40, 4)).toBe("M0,100V44Q0,40 4,40H6Q10,40 10,44V100Z");
    expect(barPath(0, 10, 100, 140, 4)).toBe("M0,100V136Q0,140 4,140H6Q10,140 10,136V100Z");
  });
});
