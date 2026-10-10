import { describe, expect, it } from "vitest";
import { everyBlockDoc, legacyDoc, screensDoc } from "../testing/fixtures";
import { typeCheck, unknownClasses } from "./check";
import { pascal, toTsx } from "./toTsx";

describe("toTsx", () => {
  it("names components in PascalCase", () => {
    expect(pascal("Inicio")).toBe("Inicio");
    expect(pascal("kpiRow")).toBe("KpiRow");
    expect(pascal("Guía de estilo")).toBe("GuiaDeEstilo");
    expect(pascal("404")).toBe("Section404");
    expect(pascal("¡!")).toBe("Section");
  });

  it.each([
    ["screens", screensDoc],
    ["every block", everyBlockDoc],
    ["legacy", legacyDoc],
  ])("exports TSX that compiles with tsc (%s)", (_name, make) => {
    const files = toTsx(make());
    expect(typeCheck(files)).toEqual([]);
  });

  it("uses only classes Tailwind v4 generates", async () => {
    const files = toTsx(everyBlockDoc());
    expect(await unknownClasses(files)).toEqual([]);
  });

  it("is deterministic", () => {
    expect(toTsx(screensDoc())).toEqual(toTsx(screensDoc()));
  });

  it("links screens with their routes", () => {
    const files = toTsx(screensDoc());
    const home = files["src/screens/InicioScreen.tsx"]!;
    expect(home).toBeDefined();
    expect(Object.values(files).join("\n")).toContain('href="/entrar"');
  });
});
