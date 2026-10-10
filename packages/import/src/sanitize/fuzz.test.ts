import { describe, expect, it } from "vitest";
import { importBatch } from "../batch";
import { detectFormat } from "../detect";
import { normalizeTokenName, mapRoleName, modeFromSelector, parseScaleName } from "../roles";
import { fakeParser } from "../testing/fakes";
import { parseJsonSafe, toSafeJson } from "./json";
import { clampLines, cleanName } from "./text";

// Hostile inputs from the spec's fuzz list: truncated files, 10,000-level nesting, alias cycles,
// __proto__, megabyte lines. Everything must end quickly, without throwing or polluting prototypes.

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const fast = <T>(fn: () => T, ms = 1500): T => {
  const start = performance.now();
  const out = fn();
  expect(performance.now() - start).toBeLessThan(ms);
  return out;
};

describe("fuzz: nesting and keys", () => {
  it("rejects 10,000 nested arrays and objects before JSON.parse", () => {
    expect(fast(() => parseJsonSafe("[".repeat(10_000) + "]".repeat(10_000)))).toMatchObject({ ok: false, code: "too-deep" });
    expect(fast(() => parseJsonSafe('{"a":'.repeat(10_000) + "1" + "}".repeat(10_000)))).toMatchObject({ ok: false, code: "too-deep" });
    expect(parseJsonSafe("[".repeat(64) + "]".repeat(64))).toMatchObject({ ok: true });
    expect(parseJsonSafe("[".repeat(65) + "]".repeat(65))).toMatchObject({ ok: false, code: "too-deep" });
  });

  it("stops on cycles and alias bombs (shared references) by node count", () => {
    const cyclic: Record<string, unknown> = { name: "loop" };
    cyclic.self = cyclic;
    expect(fast(() => toSafeJson(cyclic))).toMatchObject({ ok: false });
    let bomb: unknown[] = ["lol"];
    for (let i = 0; i < 30; i++) bomb = [bomb, bomb];
    expect(fast(() => toSafeJson(bomb, { maxNodes: 100_000 }))).toMatchObject({ ok: false, code: "too-many-nodes" });
  });

  it("never lets dangerous keys through, at any depth", () => {
    const keys = ["__proto__", "constructor", "prototype", "a", "b"];
    const random = rng(7);
    for (let round = 0; round < 200; round++) {
      let text = "1";
      for (let depth = 0; depth < 1 + Math.floor(random() * 20); depth++) {
        const key = keys[Math.floor(random() * keys.length)]!;
        text = random() < 0.3 ? `[${text}]` : `{"${key}":${text},"x":1}`;
      }
      const result = parseJsonSafe(text);
      expect(result.ok).toBe(true);
      if (result.ok) expect(JSON.stringify(result.value)).not.toMatch(/__proto__|constructor|prototype/);
    }
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});

describe("fuzz: long lines and regexes", () => {
  it("keeps every text helper linear on megabyte lines", () => {
    const line = "--a-".repeat(250_000);
    fast(() => clampLines(line));
    fast(() => cleanName(line));
    fast(() => normalizeTokenName(line));
    fast(() => mapRoleName(line));
    fast(() => parseScaleName(line));
    fast(() => modeFromSelector(`${".dark".repeat(200_000)}x`));
  });

  it("detects random and truncated bytes without throwing", () => {
    const random = rng(42);
    for (let i = 0; i < 300; i++) {
      const bytes = new Uint8Array(Math.floor(random() * 2048)).map(() => Math.floor(random() * 256));
      expect(() => detectFormat(bytes, ["a.png", "a.css", "a.json", "a.aco", ""][i % 5]!)).not.toThrow();
    }
  });
});

describe("fuzz: the batch", () => {
  it("survives hostile parser output and garbage files", async () => {
    const evil = fakeParser("css", "css", () => ({
      format: "Not A Slug!",
      colors: [
        { value: "#fff", name: "__proto__", role: "constructor" as never, locator: "‮".repeat(500), confidence: "certain" as never, method: "magic" as never },
        { value: "x".repeat(100_000), locator: "a", confidence: "exact", method: "declared" },
        { value: "oklch(0.5 0.1 200)", scale: { group: "\u0000", step: 1e9 }, locator: "b", confidence: "exact", method: "declared" },
      ],
      shape: { radius: { value: Number.NaN, unit: "px", px: Infinity, locator: "c", confidence: "exact", method: "declared" } },
      typeScale: [{ name: "", locator: "d", confidence: "exact", method: "declared" }],
      notes: [42 as never, "ok"],
      warnings: [{ code: "x".repeat(500) }],
    }));
    const random = rng(3);
    const files = Array.from({ length: 6 }, (_, i) => ({ name: `f${i}`, bytes: new Uint8Array(512).map(() => Math.floor(random() * 256)) }));
    const brand = await importBatch([{ name: "a.css", bytes: new TextEncoder().encode(":root{--a:#fff}") }, ...files], { parsers: [evil], ownership: "own" });
    expect(brand.colors).toHaveLength(2);
    expect(brand.colors[0]).toMatchObject({ hex: "#ffffff", confidence: "low", method: "declared", name: "__proto__" });
    expect(brand.colors[0]!.role).toBeUndefined();
    expect(brand.colors[0]!.locator).toBe("a.css");
    expect(brand.colors[1]!.scale).toBeUndefined();
    expect(brand.shape.radius).toBeUndefined();
    expect(brand.typeScale).toBeUndefined();
    expect(brand.notes).toEqual(["ok"]);
    expect(brand.sources[0]!.format).toBe("css");
    expect(brand.files).toHaveLength(7);
    expect(brand.warnings.find((w) => w.sourceId !== "batch")!.code.length).toBeLessThanOrEqual(64);
  });
});
