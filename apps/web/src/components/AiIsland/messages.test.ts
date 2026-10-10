import { describe, expect, it } from "vitest";
import { acceptIslandMessage } from "./messages";

const frame = { name: "island" };

describe("island messages", () => {
  it("accepts valid messages from its own iframe about its own block", () => {
    expect(acceptIslandMessage({ source: frame, data: { type: "size", blockId: "b-1", height: 300 } }, frame, "b-1")).toEqual({ type: "size", blockId: "b-1", height: 300 });
    expect(acceptIslandMessage({ source: frame, data: { type: "ready", v: 1 } }, frame, "b-1")?.type).toBe("ready");
  });

  it("ignores other windows, other blocks and malformed data", () => {
    expect(acceptIslandMessage({ source: {}, data: { type: "size", blockId: "b-1", height: 300 } }, frame, "b-1")).toBeNull();
    expect(acceptIslandMessage({ source: frame, data: { type: "textEdit", blockId: "b-2", t: 0, text: "x" } }, frame, "b-1")).toBeNull();
    expect(acceptIslandMessage({ source: frame, data: { type: "textEdit", blockId: "b-1", t: 0, text: "x", extra: 1 } }, frame, "b-1")).toBeNull();
    expect(acceptIslandMessage({ source: null, data: { type: "ready", v: 1 } }, null, "b-1")).toBeNull();
  });
});
