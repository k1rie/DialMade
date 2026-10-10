import { describe, expect, it } from "vitest";
import { drawAssets, insertBlock } from "./insert";

describe("island second wall", () => {
  it("copies only allowed tags and attributes (template path)", () => {
    const host = document.createElement("div");
    insertBlock(host, '<section class="p-4" data-block-id="b"><p onclick="x()" style="color:red" data-dl-t="0">Hola</p><a href="javascript:alert(1)">x</a><a href="#screen:s-2">y</a><script>alert(1)</script><iframe></iframe></section>');
    expect(host.innerHTML).toBe('<section class="p-4" data-block-id="b"><p data-dl-t="0">Hola</p><a>x</a><a href="#screen:s-2">y</a></section>');
  });

  it("draws icons and placeholders as inline SVG with the image's classes and alt", () => {
    const host = document.createElement("div");
    host.innerHTML = '<i data-icon="check" class="size-4"></i><img class="w-full" data-placeholder="avatar" alt="Ana">';
    drawAssets(host);
    expect(host.querySelector("i svg")).not.toBeNull();
    const svg = host.querySelector("svg[data-placeholder]")!;
    expect(svg.getAttribute("class")).toBe("w-full");
    expect(svg.getAttribute("aria-label")).toBe("Ana");
    expect(host.querySelector("img")).toBeNull();
  });
});
