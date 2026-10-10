import { describe, expect, it } from "vitest";
import { utf8ByteLength } from "./utf8";

describe("utf8ByteLength", () => {
  // Expected sizes are TextEncoder's (lone surrogates become U+FFFD, 3 bytes).
  it.each([
    ["", 0],
    ["hola", 4],
    ["diseño", 7],
    ["设计", 6],
    ["🎨✨", 7],
    ["a\uD800b", 5],
    ["\uDC00", 3],
  ])("%j is %i bytes", (text, bytes) => {
    expect(utf8ByteLength(text)).toBe(bytes);
  });
});
