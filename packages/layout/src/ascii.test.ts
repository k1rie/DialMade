import { describe, expect, test } from "vitest";
import { toAsciiWireframe } from "./ascii";
import { fixture, makeLayout } from "./testing/fixtures";

describe("toAsciiWireframe", () => {
  test("boxes with labels, counts and notes; only ASCII borders", () => {
    const layout = makeLayout([
      { id: "nav", type: "navbar", rect: [0, 0, 12, 8], label: "Navbar" },
      { id: "cards", type: "cards", rect: [0, 8, 12, 30], label: "Cards", count: 3, note: "pricing tiers" },
    ]);
    expect(toAsciiWireframe(layout, { width: 24 })).toBe(
      [
        "+----------------------+",
        "| Navbar               |",
        "+----------------------+",
        "| Cards ×3             |",
        "| pricing tiers        |",
        "|                      |",
        "|                      |",
        "|                      |",
        "|                      |",
        "|                      |",
        "+----------------------+",
      ].join("\n"),
    );
  });

  test("every box keeps an interior line, even 1 row tall", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 6, 1], label: "A" },
      { id: "b", type: "text", rect: [6, 0, 6, 1], label: "B" },
    ]);
    expect(toAsciiWireframe(layout, { width: 13 })).toBe("+-----+-----+\n| A   | B   |\n+-----+-----+");
  });

  test("labels are truncated to the box; custom label and numbering", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 3, 8], label: "A very long label" },
      { id: "b", type: "text", rect: [3, 0, 9, 8], label: "B" },
    ]);
    const label = (block: { label: string }, id: string) => `${id}:${block.label}`;
    expect(toAsciiWireframe(layout, { width: 25, label }).split("\n")[1]).toBe("| a:A | b:B             |");
    expect(toAsciiWireframe(layout, { width: 25, numbered: true, label }).split("\n")[1]).toBe("| 1.  | 2. b:B          |");
    expect(toAsciiWireframe(layout, { width: 25 }).split("\n")[1]).toBe("| A v | B               |");
  });

  test("children are drawn inside their parents and overlays last", () => {
    const text = toAsciiWireframe(fixture("modal-overlay").layout, { width: 30 });
    const lines = text.split("\n");
    expect(lines[0]).toBe("+----------------------------+");
    expect(lines[1]).toBe("| Customers                  |");
    expect(lines[3]).toBe("|      +--------------+      |");
    expect(lines[4]).toBe("|      | Invite       |      |");
    expect(lines[5]).toBe("|      |  +--------+  |      |");
    expect(lines[6]).toBe("|      |  | Invite |  |      |");
  });

  test("breakpoints use the derived rects and leave hidden blocks out", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 6, 8], label: "Left" },
      { id: "b", type: "text", rect: [6, 0, 6, 8], label: "Right" },
    ]);
    layout.blocks.b!.responsive = { mobile: { hidden: true } };
    expect(toAsciiWireframe(layout, { breakpoint: "tablet", width: 17 })).toBe(
      "+-------+-------+\n| Left  | Right |\n+-------+-------+",
    );
    expect(toAsciiWireframe(layout, { breakpoint: "mobile", width: 12 })).toBe("+----------+\n| Left     |\n+----------+");
  });

  test("labels with line breaks stay on one line; trailing spaces are trimmed", () => {
    const layout = makeLayout([{ id: "a", type: "text", rect: [0, 0, 6, 8], label: "two\nlines" }]);
    const text = toAsciiWireframe(layout, { width: 25 });
    expect(text.split("\n")[1]).toBe("| two lines |");
    for (const line of text.split("\n")) expect(line).toBe(line.trimEnd());
  });

  test("empty layout", () => {
    expect(toAsciiWireframe(fixture("empty").layout)).toBe("");
  });
});

describe("toAsciiWireframe robustness", () => {
  test("huge rects never make a huge wireframe (and never throw)", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 12, 10] },
      { id: "b", type: "text", rect: [0, 10, 12, 1e10] },
      { id: "c", type: "text", rect: [0, 1e12, 12, 1e12] },
    ]);
    for (const breakpoint of ["desktop", "tablet", "mobile"] as const) {
      const text = toAsciiWireframe(layout, { breakpoint, width: 2_000_000 });
      const lines = text.split("\n");
      expect(lines.length).toBeLessThan(2100);
      expect(Math.max(...lines.map((line) => line.length))).toBeLessThanOrEqual(1000);
    }
  });

  test("wide characters count two columns, accents none: the right border stays aligned", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 6, 10], label: "日本語のラベル日本語のラベル" },
      { id: "b", type: "text", rect: [6, 0, 6, 10], label: "🛒 Carrito de compras" },
      { id: "c", type: "text", rect: [0, 10, 12, 10], label: "👩‍💻 Dev ❤️ Café 🇪🇸" },
    ]);
    expect(toAsciiWireframe(layout, { width: 30 })).toBe(
      [
        "+--------------+-------------+",
        "| 日本語のラベ | 🛒 Carrito  |",
        "|              |             |",
        "+----------------------------+",
        "| 👩‍💻 Dev ❤️ Café 🇪🇸          |",
        "|                            |",
        "+----------------------------+",
      ].join("\n"),
    );
  });
});
