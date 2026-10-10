import { readFileSync } from "node:fs";
import type { LayoutDoc } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import type { GeneratedScreen, GenerateResult } from "../../types";
import { hasBlocks, layoutJson, nextLiveMessage, pickScreenId, REPORT_VIEWS } from "./report";

const empty: LayoutDoc = { version: 1, columns: 12, rowUnit: 8, blocks: {} };
const withHero: LayoutDoc = {
  ...empty,
  blocks: { "b-hero01": { type: "hero", label: "Hero", rect: { col: 0, row: 0, w: 12, h: 40 }, z: 0 } },
};

const screen = (screenId: string, layout: LayoutDoc = empty) =>
  ({ screenId, name: screenId, kind: "landing", route: `/${screenId}`, shell: null, layout }) as unknown as GeneratedScreen;
const result: GenerateResult = { screens: [screen("s-a"), screen("s-b")], changed: 0 };

describe("pickScreenId", () => {
  it("keeps the current pick, else the preferred screen, else the first", () => {
    expect(pickScreenId(result, "s-a", "s-b")).toBe("s-b");
    expect(pickScreenId(result, "s-b", "s-gone")).toBe("s-b");
    expect(pickScreenId(result, "s-gone")).toBe("s-a");
    expect(pickScreenId(result, null, null)).toBe("s-a");
  });

  it("is null without screens", () => {
    expect(pickScreenId(null, "s-a")).toBeNull();
    expect(pickScreenId({ screens: [], changed: 0 }, "s-a")).toBeNull();
  });
});

describe("report helpers", () => {
  it("pretty-prints the layout document", () => {
    expect(layoutJson(empty)).toBe('{\n  "version": 1,\n  "columns": 12,\n  "rowUnit": 8,\n  "blocks": {}\n}');
    expect(JSON.parse(layoutJson(withHero))).toEqual(withHero);
  });

  it("knows when a screen has blocks", () => {
    expect(hasBlocks(empty)).toBe(false);
    expect(hasBlocks(withHero)).toBe(true);
  });

  it("orders the sub-tabs like the spec", () => {
    expect(REPORT_VIEWS).toEqual(["wireframe", "css", "json", "warnings"]);
  });
});

describe("report live region", () => {
  it("marks a repeated message so screen readers say it again", () => {
    expect(nextLiveMessage("", "Arreglo aplicado")).toBe("Arreglo aplicado");
    const again = nextLiveMessage("Arreglo aplicado", "Arreglo aplicado");
    expect(again).not.toBe("Arreglo aplicado");
    expect(again.startsWith("Arreglo aplicado")).toBe(true);
    expect(nextLiveMessage(again, "Arreglo aplicado")).toBe("Arreglo aplicado");
    expect(nextLiveMessage("Arreglo aplicado", "Diseño generado")).toBe("Diseño generado");
  });

  it("speaks from a live region inside the modal, never through the page's one (inert behind it)", () => {
    const source = readFileSync(new URL("./GenerateReport.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/useDndAnnounce/);
    const dialog = source.slice(source.indexOf("<dialog"), source.indexOf("</dialog>"));
    expect(dialog).toMatch(/role="status" aria-live="polite"/);
    // «Diseño generado…» goes to the report (said after showModal), not to the page's region.
    const bar = readFileSync(new URL("../GenerateBar.tsx", import.meta.url), "utf8");
    expect(bar).not.toMatch(/announce\(t\.announce\.generated/);
    expect(bar).toMatch(/openAnnouncement=\{/);
  });
});
