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

describe("the cropper's «Volver»", () => {
  const logo: NonNullable<PaletteFlowState["logo"]> = { name: "lumen.png", type: "image/png", objectUrl: "blob:logo", width: 64, height: 64 };

  it("after «Recortar de nuevo» goes back to the lab with the colors and the crop it had (the doc is kept)", () => {
    const crop = { x: 0.1, y: 0.1, w: 0.5, h: 0.5 };
    const lab: PaletteFlowState = { ...inPalette, logo, crop, secondary: "#22c55e" };
    const cropping = paletteFlowReducer(lab, { type: "editCrop" });
    expect(cropping.step).toBe("crop");
    const back = paletteFlowReducer(cropping, { type: "cancelCrop" });
    expect(back.step).toBe("palette");
    expect(back.primary).toBe(lab.primary);
    expect(back.secondary).toBe(lab.secondary);
    expect(back.crop).toEqual(crop);
    expect(back.logo).toBe(logo);
    // Not «drop»: useDesignDocSync drops the DesignDoc (screens, Ajustar edits) only there.
    expect(back.step).not.toBe("drop");
  });

  it("on a first crop (no colors yet) goes back to the start", () => {
    const first = paletteFlowReducer(initialPaletteFlowState, { type: "setLogo", logo });
    expect(first.step).toBe("crop");
    expect(paletteFlowReducer(first, { type: "cancelCrop" })).toEqual(initialPaletteFlowState);
  });

  it("does nothing outside the cropper", () => {
    expect(paletteFlowReducer(inPalette, { type: "cancelCrop" })).toBe(inPalette);
  });
});
