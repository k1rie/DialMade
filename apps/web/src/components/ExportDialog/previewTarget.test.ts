import type { OutputKind } from "@dialmade/catalog";
import { describe, expect, it } from "vitest";
import { sampleDoc } from "@/lib/ai/testing";
import { previewTarget } from "./previewTarget";
import { screensFixture } from "./testing";

const kindLabel = (kind: OutputKind) => ({ brand: "Guía de estilo", landing: "Landing page", app: "App" })[kind];

describe("previewTarget", () => {
  it("documents without screens: the requested kind, the active one, the focus, any page", () => {
    const doc = sampleDoc(["landing", "brand"]);
    expect(previewTarget(doc, ["brand", "landing"], kindLabel)).toEqual({ kind: "brand", label: "Guía de estilo", key: "brand" });
    expect(previewTarget(doc, [undefined, "brand"], kindLabel)).toEqual({ kind: "brand", label: "Guía de estilo", key: "brand" });
    expect(previewTarget(doc, ["app", null], kindLabel)).toEqual({ kind: "landing", label: "Landing page", key: "landing" });
    expect(previewTarget(sampleDoc(["app"]), [], kindLabel)).toEqual({ kind: "app", label: "App", key: "app" });
  });

  it("documents with screens: a screen id names the screen (and brings it); landing/app are not pages; fallback is the first screen", () => {
    const { doc } = screensFixture();
    const screen = (id: string) => ({ kind: doc.screens[id]!.kind, label: doc.screens[id]!.name, key: id, screen: doc.screens[id] });
    expect(previewTarget(doc, [undefined, "s-dashboard"], kindLabel)).toEqual(screen("s-dashboard"));
    expect(previewTarget(doc, ["s-pricing", "s-dashboard"], kindLabel)).toEqual(screen("s-pricing"));
    expect(previewTarget(doc, ["brand"], kindLabel)).toEqual({ kind: "brand", label: "Guía de estilo", key: "brand" });
    expect(previewTarget(doc, ["landing", "s-missing"], kindLabel)).toEqual(screen("s-home"));
    expect(previewTarget(doc, [], kindLabel)).toEqual({ kind: "landing", label: "Inicio", key: "s-home", screen: doc.screens["s-home"] });
  });
});
