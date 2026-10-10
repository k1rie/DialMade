import { describe, expect, it } from "vitest";
import { linearScale, niceDomain, niceStep } from "./scale";

describe("niceStep", () => {
  it("redondea a 1, 2, 2.5, 5 o 10 por potencia de 10", () => {
    expect(niceStep(100, 4)).toBe(25);
    expect(niceStep(30000, 4)).toBe(10000);
    expect(niceStep(7, 4)).toBe(2);
    expect(niceStep(0.9, 4)).toBe(0.25);
  });
});

describe("niceDomain", () => {
  it("incluye el 0 y termina en un múltiplo del paso", () => {
    expect(niceDomain([18400, 29800])).toEqual({ min: 0, max: 30000, ticks: [0, 10000, 20000, 30000] });
  });

  it("admite negativos", () => {
    const domain = niceDomain([-3, 8]);
    expect(domain.min).toBeLessThanOrEqual(-3);
    expect(domain.max).toBeGreaterThanOrEqual(8);
    expect(domain.ticks).toContain(0);
  });

  it("no se rompe con series vacías o planas", () => {
    expect(niceDomain([]).ticks.length).toBeGreaterThan(1);
    expect(niceDomain([0, 0]).max).toBeGreaterThan(0);
  });

  it("evita errores de coma flotante en las marcas", () => {
    expect(niceDomain([0.3]).ticks).toEqual([0, 0.1, 0.2, 0.3]);
  });
});

describe("linearScale", () => {
  it("interpola e invierte rangos", () => {
    const y = linearScale([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(y(100)).toBe(0);
  });
});
