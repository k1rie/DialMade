import type { LayoutWarning } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { layout as layoutText } from "../../../../i18n/layout";
import { blockFramePropsEqual, blockSurface, buildWarningViews, sameWarningViews } from "./blockFrameProps";
import type { BlockWarningView } from "./BlockWarnings/BlockWarnings";

const overlap: LayoutWarning = { code: "overlap", ids: ["a", "b"], fixes: [{ kind: "clip", id: "a", rect: { col: 0, row: 0, w: 4, h: 6 } }] };
const label = (id: string) => ({ a: "Gráfica", b: "Actividad" })[id] ?? id;
const views = (warnings: readonly LayoutWarning[] = [overlap], name = label): BlockWarningView[] => buildWarningViews(warnings, name, layoutText.es);

describe("buildWarningViews", () => {
  it("names the blocks and labels the fixes", () => {
    const [view] = views();
    expect(view?.message).toContain("Gráfica");
    expect(view?.fixes[0]?.label).toBe(layoutText.es.fixes.clip);
    expect(view?.fixes[0]?.fix).toEqual(overlap.fixes[0]);
  });
});

describe("sameWarningViews (finding 54)", () => {
  it("treats freshly built views with the same content as equal", () => {
    expect(sameWarningViews(views(), views())).toBe(true);
    expect(sameWarningViews(undefined, undefined)).toBe(true);
  });

  it("sees a changed message, fix or count", () => {
    expect(sameWarningViews(views(), views([overlap], (id) => `${label(id)}!`))).toBe(false);
    const moved: LayoutWarning = { ...overlap, fixes: [{ kind: "clip", id: "a", rect: { col: 0, row: 0, w: 4, h: 8 } }] };
    expect(sameWarningViews(views(), views([moved]))).toBe(false);
    expect(sameWarningViews(views(), views([overlap, overlap]))).toBe(false);
    expect(sameWarningViews(views(), undefined)).toBe(false);
  });
});

describe("blockFramePropsEqual (findings 54 / 55)", () => {
  const onApplyFix = () => {};
  const props = (overrides: Record<string, unknown> = {}) => ({ id: "a", left: 10, zIndex: 3, warnings: views(), onApplyFix, ...overrides });

  it("skips a re-render when only the warning arrays are new", () => {
    expect(blockFramePropsEqual(props(), props())).toBe(true);
  });

  it("re-renders for any other changed prop or changed warnings", () => {
    expect(blockFramePropsEqual(props(), props({ left: 11 }))).toBe(false);
    expect(blockFramePropsEqual(props(), props({ onApplyFix: () => {} }))).toBe(false);
    expect(blockFramePropsEqual(props(), props({ warnings: undefined }))).toBe(false);
  });
});

describe("blockSurface (finding 21)", () => {
  const base = { container: false, free: false, hidden: false, highlighted: false, dropTarget: false };

  it("never fades a hidden block: dashed border, no fill, muted struck-through name", () => {
    for (const kind of [base, { ...base, container: true }, { ...base, free: true }, { ...base, highlighted: true }]) {
      const look = blockSurface({ ...kind, hidden: true });
      expect(`${look.surface} ${look.name}`).not.toMatch(/opacity/);
      expect(look.surface).toContain("border-dashed");
      expect(look.name).toContain("text-muted");
      expect(look.name).toContain("line-through");
    }
  });

  it("keeps one fill and one border per state (no conflicting classes)", () => {
    const fills = (surface: string) => surface.split(" ").filter((name) => name.startsWith("bg-"));
    expect(fills(blockSurface({ ...base, container: true, dropTarget: true, highlighted: true }).surface)).toEqual(["bg-accent-soft"]);
    expect(fills(blockSurface(base).surface)).toEqual(["bg-surface"]);
    expect(blockSurface({ ...base, highlighted: true }).surface).not.toContain("hover:");
    expect(blockSurface(base).name).toBe("text-fg");
  });
});
