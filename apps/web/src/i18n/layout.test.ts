import type { LayoutWarningCode, LibraryBlockType } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { layout } from "./layout";

const { es, en } = layout;
const types = Object.keys(es.blocks) as LibraryBlockType[];
const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Same keys at every level, and functions where the other locale has functions. */
function shape(value: unknown): unknown {
  if (typeof value === "function") return "fn";
  if (Array.isArray(value)) return "array";
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]));
  }
  return typeof value;
}

describe("layout dictionary", () => {
  it("has the same shape in es and en", () => {
    expect(shape(en)).toEqual(shape(es));
  });

  it("names and describes all 41 block types in both locales", () => {
    expect(types).toHaveLength(41);
    for (const type of types) {
      for (const locale of [es, en]) {
        expect(locale.blocks[type].name.length, type).toBeGreaterThan(0);
        expect(locale.blocks[type].description.length, type).toBeGreaterThan(0);
      }
    }
  });

  it("makes every block findable by its Spanish and English name in both locales", () => {
    for (const type of types) {
      for (const locale of [es, en]) {
        const synonyms = locale.blocks[type].synonyms.map(normalize);
        expect(synonyms, `${type}: ${es.blocks[type].name}`).toContain(normalize(es.blocks[type].name));
        expect(synonyms, `${type}: ${en.blocks[type].name}`).toContain(normalize(en.blocks[type].name));
      }
    }
  });

  it("maps the documented synonyms", () => {
    expect(en.blocks.calendar.synonyms).toContain("agenda");
    expect(es.blocks.navbar.synonyms).toContain("header");
    expect(es.blocks.cards.synonyms).toContain("tarjetas");
    expect(en.blocks.pricing.synonyms).toContain("planes");
  });

  it("shows 1-based columns and px of the design", () => {
    const rect = { col: 0, row: 3, w: 8, h: 60 };
    expect(es.canvas.position(rect)).toBe("columnas 1 a 8, de 24 a 504 px");
    expect(en.canvas.position(rect)).toBe("columns 1 to 8, 24 to 504 px");
    expect(es.canvas.position({ col: 11, row: 0, w: 1, h: 8 })).toBe("columna 12, de 0 a 64 px");
  });

  it("builds the accessible name of a block", () => {
    const rect = { col: 0, row: 3, w: 8, h: 60 };
    expect(es.canvas.block({ name: "Calendario semanal", type: "Calendario", note: "semana laboral.", count: 3, rect, hidden: true })).toBe(
      "Calendario semanal (Calendario). Cantidad: 3. Nota: semana laboral. Columnas 1 a 8, de 24 a 504 px. Oculto.",
    );
    expect(en.canvas.block({ name: "Table", type: "Table", rect, soon: true })).toBe("Table. Columns 1 to 8, 24 to 504 px. Coming soon.");
  });

  it("formats content estimates", () => {
    expect(es.estimate({ kind: "count", unit: "rows", value: 8 })).toBe("8 filas");
    expect(es.estimate({ kind: "count", unit: "plans", value: 1 })).toBe("1 plan");
    expect(en.estimate({ kind: "count", unit: "items", value: 1 })).toBe("1 item");
    expect(es.estimate({ kind: "variant", value: "month" })).toBe("Mes");
    expect(en.estimate({ kind: "variant", value: "mini-month" })).toBe("Mini month");
    expect(es.estimate({ kind: "variant", value: "two-up" })).toBe("Two up");
    expect(es.estimate({ kind: "variant", value: "constructor" })).toBe("Constructor");
    expect(en.estimate({ kind: "ratio", value: "16:9" })).toBe("16:9");
  });

  it("writes a message for every warning code, with the block names", () => {
    const codes = Object.keys(es.warnings) as LayoutWarningCode[];
    expect(codes).toHaveLength(9);
    for (const code of codes) {
      for (const locale of [es, en]) {
        expect(locale.warnings[code](["Tabla", "Contenedor"]).length).toBeGreaterThan(0);
        expect(locale.warnings[code]([]).length).toBeGreaterThan(0);
      }
    }
    expect(es.warnings.overlap(["Tabla", "Imagen"])).toBe("Tabla e Imagen se solapan.");
    expect(es.warnings.overlap(["Tabla", "Hielo", "Lista"])).toBe("Tabla, Hielo y Lista se solapan.");
    expect(en.warnings.overlap(["Table", "Media", "List"])).toBe("Table, Media and List overlap.");
    expect(es.warnings["outside-parent"](["Tabla", "Contenedor"])).toBe("Tabla se sale de Contenedor.");
  });

  it("pluralizes counts", () => {
    expect(es.generate.regenerate(1)).toBe("Regenerar 1 bloque");
    expect(es.generate.regenerate(3)).toBe("Regenerar 3 bloques");
    expect(es.generate.status({ screens: 3, blocks: 24, warnings: 0, free: 1 })).toBe("3 pantallas · 24 bloques (1 libre) · sin avisos");
    expect(en.generate.status({ screens: 1, blocks: 1, warnings: 2, free: 0 })).toBe("1 screen · 1 block · 2 warnings");
  });

  it("lists the shortcuts with the platform keys", () => {
    const apple = { mod: "⌘", shift: "⇧", combo: (...keys: string[]) => keys.join("") };
    const rows = es.shortcuts.list(apple);
    expect(rows.some((row) => row.keys === "⌘D")).toBe(true);
    expect(rows.some((row) => row.keys.includes("⇧⌘Z"))).toBe(true);
    expect(en.shortcuts.list(apple)).toHaveLength(rows.length);
  });
});
