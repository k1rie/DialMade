import { MAX_SCREENS } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { MAX_COPY_SCREENS, MAX_SECTION_IDS } from "./config";
import { collectScreenCopyFields } from "./fields";
import { allBlocks, blockKey, copyBlockStates, normalizeScreenTargets, offeredBlocks, parseBlockKey, retryTargets } from "./layoutCopy";
import { editsToPatches } from "./patches";
import { sampleScreensDoc } from "./testing";

const ids = (n: number, prefix = "b") => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);

describe("normalizeScreenTargets", () => {
  it("merges repeated screens (a whole request wins), dedupes ids and drops empty requests", () => {
    expect(
      normalizeScreenTargets([
        { id: "s-1", sectionIds: ["b-1", "b-2"] },
        { id: "s-2", sectionIds: [] },
        { id: "s-1", sectionIds: ["b-2", "b-3"] },
        { id: "s-3", sectionIds: ["b-9"] },
        { id: "s-3" },
      ]),
    ).toEqual([{ id: "s-1", sectionIds: ["b-1", "b-2", "b-3"] }, { id: "s-3" }]);
  });

  it(`sends every screen whole over ${MAX_SECTION_IDS} section ids in total, and keeps at most 24 screens`, () => {
    const fits = normalizeScreenTargets([
      { id: "s-1", sectionIds: ids(MAX_SECTION_IDS - 1) },
      { id: "s-2", sectionIds: ["b-x"] },
    ]);
    expect(fits.every((target) => target.sectionIds)).toBe(true);
    const over = normalizeScreenTargets([
      { id: "s-1", sectionIds: ids(MAX_SECTION_IDS) },
      { id: "s-2", sectionIds: ["b-x"] },
    ]);
    expect(over).toEqual([{ id: "s-1" }, { id: "s-2" }]);
    expect(normalizeScreenTargets(ids(30, "s").map((id) => ({ id })))).toHaveLength(MAX_COPY_SCREENS);
  });

  it("caps screens like the document does", () => {
    expect(MAX_COPY_SCREENS).toBe(MAX_SCREENS);
  });
});

describe("block states", () => {
  const doc = sampleScreensDoc();
  const fields = collectScreenCopyFields(doc, [{ id: "s-home" }, { id: "s-detail" }]);
  const hero = fields.filter((field) => field.screenId === "s-home" && field.sectionType === "landing.hero");
  const text = fields.filter((field) => field.screenId === "s-detail" && field.sectionType === "ui.text");
  const list = fields.filter((field) => field.screenId === "s-detail" && field.sectionType === "ui.list");

  it("keys blocks by screen and element, without the brand tagline", () => {
    expect(parseBlockKey(blockKey("s-home", "b-000001"))).toEqual({ screenId: "s-home", elementId: "b-000001" });
    expect(parseBlockKey("nope")).toBeNull();
    const offered = offeredBlocks(fields);
    expect(offered).toContain(blockKey("s-home", hero[0]!.elementId!));
    expect(offered.some((key) => key.includes("tagline") || key.startsWith("undefined"))).toBe(false);
    expect(Object.values(allBlocks(fields, "writing")).every((state) => state === "writing")).toBe(true);
  });

  it("«Listo» with an applied op, «Error» with only rejects, «Sin cambios» otherwise", () => {
    const result = editsToPatches(doc, fields, [
      { id: hero[0]!.id, text: "Título nuevo del hero" },
      { id: text[0]!.id, text: "" },
      { id: list[0]!.id, text: "x".repeat(list[0]!.maxLength + 1) },
      { id: list[1]!.id, text: "Últimos movimientos" },
    ]);
    const states = copyBlockStates(fields, result.patches, result.rejectedIds);
    expect(states[blockKey("s-home", hero[0]!.elementId!)]).toBe("done");
    expect(states[blockKey("s-detail", text[0]!.elementId!)]).toBe("error");
    expect(states[blockKey("s-detail", list[0]!.elementId!)]).toBe("done");
    const others = Object.entries(states).filter(([key]) => ![hero[0], text[0], list[0]].some((field) => key === blockKey(field!.screenId!, field!.elementId!)));
    expect(others.length).toBeGreaterThan(0);
    expect(others.every(([, state]) => state === "unchanged")).toBe(true);
    expect(retryTargets(states)).toEqual([{ id: "s-detail", sectionIds: [text[0]!.elementId] }]);
  });
});
