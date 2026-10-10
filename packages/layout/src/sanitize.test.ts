import { describe, expect, test } from "vitest";
import { LABEL_MAX, NOTE_MAX } from "./constants";
import { sanitizeLabel, sanitizeLine, sanitizeNote } from "./sanitize";

const ch = (code: number) => String.fromCharCode(code);

describe("sanitizeLine", () => {
  test("one line: controls and separators become spaces, whitespace collapses", () => {
    expect(sanitizeLine("  calendario\nsemanal\t\tcon  notas\r\n", 200)).toBe("calendario semanal con notas");
    expect(sanitizeLine(`a${ch(0)}b${ch(0x1f)}c${ch(0x7f)}d${ch(0x85)}e`, 200)).toBe("a b c d e");
    expect(sanitizeLine(`one${ch(0x2028)}two${ch(0x2029)}three`, 200)).toBe("one two three");
  });

  test("bidi controls and the BOM are removed", () => {
    const bidi = [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069, 0x200e, 0x200f, 0x061c, 0xfeff];
    const dirty = bidi.map((code) => `x${ch(code)}`).join("");
    expect(sanitizeLine(dirty, 200)).toBe("x".repeat(bidi.length));
    expect(sanitizeLine(`${ch(0x202e)}gnp.exe`, 200)).toBe("gnp.exe");
  });

  test("keeps emoji, accents and ZWJ sequences", () => {
    const family = `${String.fromCodePoint(0x1f468)}${ch(0x200d)}${String.fromCodePoint(0x1f469)}`;
    expect(sanitizeLine(`Cañón ${family} ×3`, 200)).toBe(`Cañón ${family} ×3`);
  });

  test("caps without splitting a surrogate pair", () => {
    const emoji = String.fromCodePoint(0x1f600); // 2 code units
    const text = `${"a".repeat(199)}${emoji}`;
    const cut = sanitizeLine(text, 200);
    expect(cut).toBe("a".repeat(199));
    expect(cut.length).toBeLessThanOrEqual(200);
    const exact = `${"a".repeat(198)}${emoji}`;
    expect(sanitizeLine(exact, 200)).toBe(exact);
    const lone = sanitizeLine(emoji.repeat(150), 200);
    expect(lone.length).toBe(200);
    expect(Array.from(lone).every((c) => c === emoji)).toBe(true);
  });

  test("trims after cutting and rejects non-strings", () => {
    expect(sanitizeLine("aaaaa     bbbb", 6)).toBe("aaaaa");
    expect(sanitizeLine(undefined, 10)).toBe("");
    expect(sanitizeLine(42, 10)).toBe("");
  });
});

describe("note and label", () => {
  test("note ≤ 200, label ≤ 60", () => {
    expect(sanitizeNote("x".repeat(500))).toHaveLength(NOTE_MAX);
    expect(sanitizeLabel("y".repeat(500))).toHaveLength(LABEL_MAX);
    expect(sanitizeLabel("  Hero\nprincipal ")).toBe("Hero principal");
  });
});
