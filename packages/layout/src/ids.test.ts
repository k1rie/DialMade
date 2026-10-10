import { describe, expect, test } from "vitest";
import {
  fnv1a32,
  hashString,
  isNewBlockId,
  isReservedBlockId,
  isValidBlockId,
  newBlockId,
  regionId,
  RESERVED_BLOCK_IDS,
} from "./ids";
import { mulberry32 } from "./testing/random";

describe("newBlockId", () => {
  test("b- + 6 base36 chars, deterministic with an injected source", () => {
    const a = newBlockId(undefined, mulberry32(1));
    const b = newBlockId(undefined, mulberry32(1));
    expect(a).toMatch(/^b-[0-9a-z]{6}$/);
    expect(a).toBe(b);
    expect(isNewBlockId(a)).toBe(true);
  });

  test("uses crypto.getRandomValues by default", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newBlockId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^b-[0-9a-z]{6}$/);
  });

  test("never returns a taken id (Set, array or blocks record)", () => {
    const first = newBlockId(undefined, mulberry32(7));
    for (const taken of [new Set([first]), [first], { [first]: {} }]) {
      const next = newBlockId(taken, mulberry32(7));
      expect(next).not.toBe(first);
      expect(next).toMatch(/^b-[0-9a-z]{6}$/);
    }
  });

  test("a constant source cannot loop forever", () => {
    const zero = () => 0;
    const id = newBlockId(undefined, zero);
    expect(id).toBe("b-000000");
    expect(() => newBlockId([id], zero)).toThrow(/free id/);
  });

  test("a source returning 1 stays in range", () => {
    expect(newBlockId(undefined, () => 0.9999999999)).toBe("b-zzzzzz");
  });
});

describe("id validation", () => {
  test("isNewBlockId", () => {
    expect(isNewBlockId("b-abc123")).toBe(true);
    expect(isNewBlockId("b-ABC123")).toBe(false);
    expect(isNewBlockId("b-abc12")).toBe(false);
    expect(isNewBlockId("hero-1")).toBe(false);
    expect(isNewBlockId(42)).toBe(false);
  });

  test("isValidBlockId accepts ElementIdSchema ids but not the r- prefix", () => {
    expect(isValidBlockId("hero-1")).toBe(true);
    expect(isValidBlockId("b-abc123")).toBe(true);
    expect(isValidBlockId("A_b-9")).toBe(true);
    expect(isValidBlockId("r-abc")).toBe(false);
    expect(isValidBlockId("-hero")).toBe(false);
    expect(isValidBlockId("hero 1")).toBe(false);
    expect(isValidBlockId("")).toBe(false);
    expect(isValidBlockId("a".repeat(64))).toBe(true);
    expect(isValidBlockId("a".repeat(65))).toBe(false);
    expect(isValidBlockId(null)).toBe(false);
  });

  test("root, shell and layout are reserved for the compiled page", () => {
    for (const id of RESERVED_BLOCK_IDS) {
      expect(isValidBlockId(id)).toBe(false);
      expect(isReservedBlockId(id)).toBe(true);
    }
    expect(RESERVED_BLOCK_IDS).toEqual(["root", "shell", "layout"]);
    // Only the exact ids: similar ones stay valid.
    for (const id of ["Root", "shell-1", "layouts", "my-layout"]) expect(isValidBlockId(id)).toBe(true);
    expect(isReservedBlockId("r-abc")).toBe(true);
    expect(isReservedBlockId("hero-1")).toBe(false);
  });
});

describe("hashes", () => {
  test("FNV-1a 32 reference values", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a32("a")).toBe(0xe40c292c);
    expect(fnv1a32("foobar")).toBe(0xbf9cf968);
    expect(hashString("a")).toBe((0xe40c292c).toString(36));
  });

  test("regionId depends on members (any order) and kind", () => {
    const a = regionId(["b", "a", "c"], "stack");
    expect(a).toMatch(/^r-[0-9a-z]+$/);
    expect(regionId(["c", "a", "b"], "stack")).toBe(a);
    expect(regionId(["a", "b", "c"], "row")).not.toBe(a);
    expect(regionId(["a", "b"], "stack")).not.toBe(a);
  });
});
