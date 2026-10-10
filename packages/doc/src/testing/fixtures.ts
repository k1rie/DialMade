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
