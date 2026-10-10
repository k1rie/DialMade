import { addPage, createDesignDoc, type CreateDesignDocInput } from "../doc";
import type { DesignDoc } from "../schema";

export const CREATED_AT = "2026-10-09T12:00:00.000Z";

export const acmeInput: CreateDesignDocInput = {
  brand: { name: "Acme Cloud", tagline: "Ship faster, sleep better", seeds: { primary: "#3A5BD9", secondary: "#f0a024" } },
  brief: { productType: "saas-general", focus: "landing", locale: "en" },
  provenance: { createdAt: CREATED_AT },
};

/** A doc with every page, the landing focused. */
export function acmeDoc(): DesignDoc {
  let doc = createDesignDoc(acmeInput);
  doc = addPage(doc, "landing");
  doc = addPage(doc, "brand");
  doc = addPage(doc, "app");
  return doc;
}

export const monoDoc = (): DesignDoc =>
  createDesignDoc({
    brand: { name: "Noir", seeds: { primary: "#171717" } },
    brief: { productType: "developer-tool-ide", focus: "app", locale: "es" },
    provenance: { createdAt: CREATED_AT },
  });

export const IMPORT_SHA = "3f".repeat(32);

/** Acme after importing its (fictional) `globals.css`: accepted values in `tokens`, locks and provenance. */
export const importedInput: CreateDesignDocInput = {
  ...acmeInput,
  brief: {
    ...acmeInput.brief,
    locks: ["/tokens/color/light/primary", "/tokens/color/dark/border", "/tokens/radius/md", "/tokens/typography/heading", "pairingId"],
  },
  tokens: {
    color: {
      light: { primary: "#2f4fd0", "primary-foreground": "#ffffff" },
      dark: { border: "#ffffff1a", input: "#ffffff26" },
    },
    radius: { md: 10 },
    space: { "4": 18 },
    borderWidth: 1,
    typography: {
      heading: { family: "Brand Grotesk", source: "local", substitute: "Arimo", fallback: ["system-ui", "sans-serif"], weights: [600, 700] },
      body: { family: "Inter", source: "google", weights: [400, 500, 600] },
      scale: { h1: { lineHeight: 1.1, letterSpacing: -0.02, weight: 700 }, body: { lineHeight: 1.5, weight: 400 } },
    },
    elevation: { sm: [{ x: 0, y: 1, blur: 2, spread: 0, color: "#000000", alpha: 0.05 }], lg: [] },
  },
  provenance: {
    createdAt: CREATED_AT,
    imports: [
      {
        sourceId: "src-1",
        kind: "css",
        format: "shadcn-oklch",
        fileName: "globals.css",
        sha256: IMPORT_SHA,
        bytes: 4096,
        parser: "css@1.0.0",
        ownership: "own",
        rightsConfirmedAt: CREATED_AT,
        fields: [
          { path: "/tokens/color/light/primary", locator: "globals.css:12 --primary", confidence: "exact", method: "declared" },
          { path: "/tokens/color/dark/border", locator: "globals.css:58 --border", confidence: "exact", method: "declared" },
          { path: "/tokens/radius/md", locator: "globals.css:40 --radius", confidence: "high", method: "declared" },
          { path: "/tokens/typography/heading/family", locator: "globals.css:129 --font-heading", confidence: "medium", method: "named" },
        ],
        dismissed: ["globals.css:20 --chart-1"],
      },
    ],
  },
};

export const importedDoc = (): DesignDoc => createDesignDoc(importedInput);
