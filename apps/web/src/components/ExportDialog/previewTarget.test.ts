import type { OutputKind } from "@dialmade/catalog";
import { describe, expect, it } from "vitest";
import { sampleDoc } from "@/lib/ai/testing";
import { previewTarget } from "./previewTarget";
import { screensFixture } from "./testing";

const kindLabel = (kind: OutputKind) => ({ brand: "Guía de estilo", landing: "Landing page", app: "App" })[kind];

describe("previewTarget", () => {
  it("documents without screens: the requested kind, the active one, the focus, any page", () => {
    const doc = sampleDoc(["landing", "brand"]);
    expect(previewTarget(doc, ["brand", "landing"], kindLabel)).toEqual({ kind: "brand", label: "Guía de estilo" });
    expect(previewTarget(doc, [undefined, "brand"], kindLabel)).toEqual({ kind: "brand", label: "Guía de estilo" });
    expect(previewTarget(doc, ["app", null], kindLabel)).toEqual({ kind: "landing", label: "Landing page" });
    expect(previewTarget(sampleDoc(["app"]), [], kindLabel)).toEqual({ kind: "app", label: "App" });
  });

  it("documents with screens: a screen id names the screen; landing/app are not pages; fallback is the first screen", () => {
    const { doc } = screensFixture();
    expect(previewTarget(doc, [undefined, "s-dashboard"], kindLabel)).toEqual({ kind: "app", label: "Dashboard" });
    expect(previewTarget(doc, ["s-pricing", "s-dashboard"], kindLabel)).toEqual({ kind: "landing", label: "Precios" });
    expect(previewTarget(doc, ["brand"], kindLabel)).toEqual({ kind: "brand", label: "Guía de estilo" });
    expect(previewTarget(doc, ["landing", "s-missing"], kindLabel)).toEqual({ kind: "landing", label: "Inicio" });
    expect(previewTarget(doc, [], kindLabel)).toEqual({ kind: "landing", label: "Inicio" });
  });
});
