import type { Adjustment } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { layout } from "../../i18n/layout";
import { describeAdjustments } from "./adjustments";

const names: Record<string, string> = { a: "Hero", b: "Tarjetas", c: "Contenedor" };
const nameOf = (id: string) => names[id] ?? id;
const r = { col: 0, row: 0, w: 4, h: 4 };
const t = layout.es.adjusted;

describe("describeAdjustments", () => {
  it("says nothing when nothing changed", () => {
    expect(describeAdjustments([], nameOf, t)).toBeNull();
  });

  it("describes one adjustment of one block", () => {
    expect(describeAdjustments([{ kind: "clamp", id: "a", from: r, to: r }], nameOf, t)).toBe(t.clamp("Hero"));
    expect(describeAdjustments([{ kind: "clip", id: "b", from: r, to: r }], nameOf, t)).toBe(t.clip("Tarjetas"));
    expect(describeAdjustments([{ kind: "nest", id: "a", parentId: "c" }], nameOf, t)).toBe(t.nest("Hero", "Contenedor"));
    expect(describeAdjustments([{ kind: "unnest", id: "a", parentId: "c" }], nameOf, t)).toBe(t.unnest("Hero", "Contenedor"));
  });

  it("prefers a change of container over a trim of the same block", () => {
    const adjustments: Adjustment[] = [
      { kind: "clamp", id: "a", from: r, to: r },
      { kind: "nest", id: "a", parentId: "c" },
    ];
    expect(describeAdjustments(adjustments, nameOf, t)).toBe(t.nest("Hero", "Contenedor"));
  });

  it("counts blocks, not adjustments, when several blocks changed", () => {
    const adjustments: Adjustment[] = [
      { kind: "clamp", id: "a", from: r, to: r },
      { kind: "nest", id: "a", parentId: "c" },
      { kind: "clip", id: "b", from: r, to: r },
    ];
    expect(describeAdjustments(adjustments, nameOf, t)).toBe(t.many(2));
  });
});
