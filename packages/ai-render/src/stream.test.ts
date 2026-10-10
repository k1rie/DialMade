import { describe, expect, it } from "vitest";
import { BlockStreamParser, splitBlocks } from "./stream";

const A = '<section data-block-id="a" class="@container"><h2>A</h2><ul><li>1<li>2</ul><img data-placeholder="photo" alt=">"></section>';
const B = "<footer data-block-id='b'><p>B</p><br><input type=text></footer>";

describe("block stream parser (spec §2.1)", () => {
  it("hands over each root when it closes, whatever the chunking", () => {
    const text = `\`\`\`html\n${A}\n${B}\n\`\`\``;
    for (const size of [1, 2, 3, 7, 64, text.length]) {
      const parser = new BlockStreamParser();
      const out = [];
      for (let i = 0; i < text.length; i += size) out.push(...parser.push(text.slice(i, i + size)));
      out.push(...parser.end());
      expect(out.map((b) => [b.blockId, b.html, b.forced]), `chunk ${size}`).toEqual([
        ["a", A, false],
        ["b", B, false],
      ]);
    }
  });

  it("emits a root as soon as it is closed", () => {
    const parser = new BlockStreamParser();
    expect(parser.push(A.slice(0, 40))).toEqual([]);
    expect(parser.push(A.slice(40)).map((b) => b.blockId)).toEqual(["a"]);
  });

  it("a new expected root closes one the model forgot to close", () => {
    const blocks = splitBlocks('<section data-block-id="a"><div><p>x</div><section data-block-id="b"><p>y</p></section>', ["a", "b"]);
    expect(blocks.map((b) => [b.blockId, b.forced])).toEqual([
      ["a", true],
      ["b", false],
    ]);
  });

  it("an unterminated root is flushed at the end, as forced", () => {
    expect(splitBlocks('<div data-block-id="a"><p>x')).toEqual([{ blockId: "a", html: '<div data-block-id="a"><p>x', forced: true }]);
  });

  it("ignores prose, comments and raw text that looks like tags", () => {
    const blocks = splitBlocks('Here you go:<!-- <section data-block-id="x"> --><div data-block-id="a"><textarea></div></textarea></div> done');
    expect(blocks).toEqual([{ blockId: "a", html: '<div data-block-id="a"><textarea></div></textarea></div>', forced: false }]);
  });

  it("counts what it received (the server caps it)", () => {
    const parser = new BlockStreamParser();
    parser.push("abc");
    parser.push("de");
    expect(parser.received).toBe(5);
  });
});
