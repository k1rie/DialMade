import { describe, expect, it } from "vitest";
import { detectFormat } from "../detect";
import { cssParser, defaultParsers, screenshotParser } from "../parsers";
import { fakeParser, pngHeader, utf8 } from "../testing/fakes";
import { createRegistry, notImplemented, type Parser, type SniffedFile } from "./registry";

const sniff = (bytes: Uint8Array, name: string): SniffedFile => ({ name, extension: name.split(".").pop() ?? "", bytes, detected: detectFormat(bytes, name), pasted: false });

describe("parser registry", () => {
  it("registers the six v1 parsers, each with a semver version", () => {
    expect(defaultParsers.map((p) => [p.id, p.kind])).toEqual([
      ["tokens", "tokens"],
      ["css", "css"],
      ["design-md", "design-md"],
      ["paste", "paste"],
      ["fonts", "font-name"],
      ["screenshot", "screenshot"],
    ]);
    for (const parser of defaultParsers) expect(parser.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("a stub parser says it is not implemented", async () => {
    const stub: Parser = { ...fakeParser("css", "css", {}), parse: async () => notImplemented("css") };
    const file = sniff(utf8(":root{--a:#fff}"), "a.css");
    const output = await stub.parse({ ...file, sourceId: "css-1", format: "css", ownership: "own" }, { limits: {} as never, batch: [] });
    expect(output).toEqual({ warnings: [{ code: "parser-not-implemented", detail: "css" }] });
  });

  it("picks by score, then the detector's choice, then order", () => {
    const registry = createRegistry(defaultParsers);
    expect(registry.pick(sniff(utf8(":root{--a:#fff}"), "a.css"))?.parser.id).toBe("css");
    expect(registry.pick(sniff(pngHeader(10, 10), "a.png"))?.parser).toBe(screenshotParser);
    expect(registry.pick(sniff(utf8("%PDF-1.7"), "a.pdf"))).toBeNull();

    const greedy = { ...fakeParser("paste", "paste", {}), detect: () => ({ format: "anything", score: 1 }) };
    const custom = createRegistry([cssParser, greedy]);
    expect(custom.pick(sniff(utf8(":root{--a:#fff}"), "a.css"))?.parser.id).toBe("paste");
    const throwing = { ...fakeParser("tokens", "tokens", {}), detect: () => {
      throw new Error("boom");
    } };
    expect(createRegistry([throwing, cssParser]).pick(sniff(utf8(":root{--a:#fff}"), "a.css"))?.parser.id).toBe("css");
  });

  it("rejects duplicate ids and bad versions", () => {
    expect(() => createRegistry([cssParser, cssParser])).toThrow(TypeError);
    expect(() => createRegistry([{ ...cssParser, version: "1" }])).toThrow(TypeError);
  });
});
