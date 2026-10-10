import { describe, expect, it } from "vitest";
import { StructureTracker, fixHeadings, newContacts, offDirection, structureGate, styleFingerprint } from "./gates";
import { parseSanitized, serialize, type AiElement } from "./tree";

const tree = (html: string) => parseSanitized(html)[0] as AiElement;

describe("gate 1: structure", () => {
  it("accepts every expected id once, the first duplicate wins, extras are refused", () => {
    const gate = structureGate(
      ["a", "b", "c"],
      [
        { blockId: "a", html: "A1" },
        { blockId: "x", html: "X" },
        { blockId: "a", html: "A2" },
        { blockId: null, html: "?" },
        { blockId: "c", html: "C" },
      ],
    );
    expect([...gate.accepted]).toEqual([
      ["a", "A1"],
      ["c", "C"],
    ]);
    expect(gate.missing).toEqual(["b"]);
    expect(gate.extras).toEqual(["x", "(no id)"]);
    expect(gate.duplicates).toEqual(["a"]);
    expect(gate.outOfOrder).toBe(false);
  });

  it("notices roots out of order (they still go to their own cells)", () => {
    const tracker = new StructureTracker(["a", "b"]);
    tracker.accept("b");
    expect(tracker.accept("a")).toBe("accept");
    expect(tracker.outOfOrder).toBe(true);
  });
});

describe("gate 6: headings", () => {
  it("only the h1 block keeps one h1; levels never skip", () => {
    const hero = tree("<section><h1>A</h1><h1>B</h1><h4>C</h4></section>");
    expect(fixHeadings(hero, true)).toBe(2);
    expect(serialize([hero])).toBe("<section><h1>A</h1><h2>B</h2><h3>C</h3></section>");
    const other = tree("<section><h1>A</h1><h5>B</h5><h2>C</h2></section>");
    fixHeadings(other, false);
    expect(serialize([other])).toBe("<section><h2>A</h2><h3>B</h3><h2>C</h2></section>");
  });
});

describe("gate 7: contact text", () => {
  it("flags URLs, emails and phones the developer did not write", () => {
    const root = tree("<div><p>Visit evil.example or www.x.io, mail hola@brisa.es, call +34 612 345 678. Price 1299.</p></div>");
    expect(newContacts(root, ["hola@brisa.es"]).sort()).toEqual(["+34 612 345 678", "evil.example", "www.x.io"].sort());
  });
});

describe("gate 8: coherence", () => {
  it("a block with several new radii, shadows and heading sizes is off direction", () => {
    const a = styleFingerprint(tree('<div class="rounded-card shadow-card"><h2 class="text-h2">x</h2></div>'));
    const b = styleFingerprint(tree('<div class="rounded-card shadow-card"><h2 class="text-h2">y</h2></div>'));
    const odd = styleFingerprint(tree('<div class="rounded-full shadow-lg"><h2 class="text-display">z</h2></div>'));
    expect(offDirection(odd, [a, b])).toBe(true);
    expect(offDirection(a, [b, b])).toBe(false);
    expect(offDirection(odd, [a])).toBe(false);
  });
});
