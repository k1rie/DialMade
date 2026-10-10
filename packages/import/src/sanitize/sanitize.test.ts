import { describe, expect, it } from "vitest";
import { isDangerousKey, jsonDepth, jsonPointerLocator, own, parseJsonSafe, toSafeJson, walkJson, type JsonValue } from "./json";
import { clampLines, cleanMultiline, cleanName, cleanText, decodeText, lineAt, splitLines, toIdentifier } from "./text";

describe("names", () => {
  it("drops control and bidi characters and cuts to 64 code points", () => {
    expect(cleanName("glob‮als⁦.css\u0000")).toEqual({ value: "globals.css", truncated: false });
    expect(cleanName("  a\n\tb  ")).toEqual({ value: "a b", truncated: false });
    const long = cleanName("x".repeat(100));
    expect(long).toEqual({ value: "x".repeat(64), truncated: true });
    expect(cleanName("😀".repeat(70)).value).toBe("😀".repeat(64));
    expect(cleanName("a".repeat(1_000_000)).value).toHaveLength(64);
    expect(cleanText("--primary‏", 200)).toBe("--primary");
  });

  it("keeps line breaks in prose only", () => {
    expect(cleanMultiline("Do\r\n\r\n\r\n‮Don't\t ok  \n")).toBe("Do\n\nDon't ok");
  });

  it("makes code identifiers", () => {
    expect(toIdentifier("Brand Blue/500")).toBe("brand-blue-500");
    expect(toIdentifier("Café‮")).toBe("cafe");
    expect(toIdentifier("***")).toBe("x");
  });
});

describe("lines", () => {
  it("cuts only the long lines and counts them", () => {
    expect(clampLines("a\nbb\nccc", 2)).toEqual({ text: "a\nbb\ncc", truncated: 1 });
    expect(clampLines("short\nlines")).toEqual({ text: "short\nlines", truncated: 0 });
    expect(clampLines(`${"x".repeat(20_000)}\n`, 10_000).text).toBe(`${"x".repeat(10_000)}\n`);
    expect(splitLines("a\r\nb\nc")).toEqual(["a", "b", "c"]);
    expect(lineAt("a\nb\nc", 4)).toBe(3);
  });
});

describe("decodeText", () => {
  const bytes = (...b: number[]) => new Uint8Array(b);
  it("handles BOMs, UTF-16 and invalid UTF-8", () => {
    expect(decodeText(bytes(0xef, 0xbb, 0xbf, 0x61))).toEqual({ text: "a", encoding: "utf-8", invalid: false });
    expect(decodeText(bytes(0xff, 0xfe, 0x61, 0))).toMatchObject({ text: "a", encoding: "utf-16le" });
    expect(decodeText(bytes(0xfe, 0xff, 0, 0x61))).toMatchObject({ text: "a", encoding: "utf-16be" });
    expect(decodeText(bytes(0x61, 0xff, 0x62))).toEqual({ text: "a�b", encoding: "utf-8", invalid: true });
    expect(decodeText(bytes(0x61, 0, 0x62))).toBeNull();
  });
});

describe("safe JSON", () => {
  it("drops dangerous keys and builds null-prototype objects", () => {
    const result = parseJsonSafe('{"__proto__":{"polluted":1},"a":{"constructor":{"prototype":{"x":1}},"b":[1,{"prototype":2}]}}');
    if (!result.ok) throw new Error(result.code);
    expect(result.issues.map((i) => i.path)).toEqual(["/__proto__", "/a/b/1/prototype", "/a/constructor"]);
    const value = result.value as Record<string, JsonValue>;
    expect(Object.getPrototypeOf(value)).toBeNull();
    expect(JSON.parse(JSON.stringify(value))).toEqual({ a: { b: [1, {}] } });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(own(value, "toString")).toBeUndefined();
    expect(isDangerousKey("__proto__")).toBe(true);
  });

  it("fails cleanly on invalid JSON", () => {
    expect(parseJsonSafe("{nope")).toMatchObject({ ok: false, code: "invalid-json" });
  });

  it("walks in document order without recursion", () => {
    const seen: string[] = [];
    walkJson({ a: [1, { b: 2 }], c: 3 }, (_node, path) => {
      seen.push(jsonPointerLocator(path));
    });
    expect(seen).toEqual(["#", "#/a", "#/a/0", "#/a/1", "#/a/1/b", "#/c"]);
  });

  it("copies YAML-like data: dates to ISO, functions and NaN dropped", () => {
    const result = toSafeJson({ d: new Date(Date.UTC(2026, 9, 10)), n: Number.NaN, f: () => 1, u: undefined });
    expect(result).toMatchObject({ ok: true, issues: [{ code: "invalid-value", path: "/f" }, { code: "invalid-value", path: "/n" }] });
    if (result.ok) expect(JSON.parse(JSON.stringify(result.value))).toEqual({ d: "2026-10-10T00:00:00.000Z", n: null, f: null });
  });

  it("measures depth past strings and escapes", () => {
    expect(jsonDepth('{"a":"[[[[\\"]]]","b":[[1]]}')).toBe(3);
  });
});
