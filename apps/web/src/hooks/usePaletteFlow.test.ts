import { describe, expect, it } from "vitest";
import { flowPhaseOf, initialPaletteFlowState, paletteFlowReducer, type PaletteFlowState } from "./usePaletteFlow";

const inPalette: PaletteFlowState = { ...initialPaletteFlowState, step: "palette", primary: "#7c5cff" };

describe("flow steps: Marca → Layout → Ajustar", () => {
  it("«Layout» is the second phase; the brand steps and the import stay «Marca»", () => {
    expect(flowPhaseOf("layout")).toBe("layout");
    expect(flowPhaseOf("compose")).toBe("compose");
    for (const step of ["drop", "crop", "extracting", "palette", "import", "review"] as const) expect(flowPhaseOf(step)).toBe("brand");
  });

  it("goes to «Layout» and «Ajustar» only with a brand color", () => {
    expect(paletteFlowReducer(inPalette, { type: "goTo", step: "layout" }).step).toBe("layout");
    expect(paletteFlowReducer(inPalette, { type: "goTo", step: "compose" }).step).toBe("compose");
    expect(paletteFlowReducer(initialPaletteFlowState, { type: "goTo", step: "layout" })).toBe(initialPaletteFlowState);
  });

  it("an applied guide can go straight to «Layout»", () => {
    const review: PaletteFlowState = { ...initialPaletteFlowState, step: "review" };
    const next = paletteFlowReducer(review, { type: "finishImport", outcome: { next: "layout", seeds: { primary: "#3a5bd9" } } });
    expect(next.step).toBe("layout");
    expect(next.primary).toBe("#3a5bd9");
  });
});
