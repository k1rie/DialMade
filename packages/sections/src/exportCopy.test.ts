import { describe, expect, it } from "vitest";
import { toDesignMd, toPromptPack } from "@dialmade/doc";
import { addDefaultPage } from "./buildPage";
import { acmeDoc } from "./testing/fixtures";

describe("prompt packs and DESIGN.md carry the page's list copy", () => {
  const doc = addDefaultPage(addDefaultPage(acmeDoc(), "landing", { replace: true }), "app", { replace: true });
  const landing = doc.pages.landing!;
  const features = Object.values(landing.elements).find((element) => element.type === "landing.features");
  const firstItem = (features?.props.items as { title?: string }[] | undefined)?.[0]?.title;

  it("feature titles, not only the top-level texts", () => {
    expect(firstItem).toBeTruthy();
    for (const target of ["claude", "cursor", "v0"] as const) expect(toPromptPack(doc, target, "en")).toContain(firstItem);
    expect(toDesignMd(doc, { locale: "en" })).toContain(firstItem);
  });

  it("names the component gallery and leaves hidden sections out of the prompt steps", () => {
    const hero = Object.keys(landing.elements).find((id) => landing.elements[id]?.type === "landing.hero")!;
    const hidden = { ...doc, pages: { ...doc.pages, landing: { ...landing, hidden: [hero] } } };
    const pack = toPromptPack(hidden, "v0", "en");
    expect(pack).not.toContain("`landing.hero`");
    expect(toPromptPack(doc, "v0", "en")).toContain("Component gallery (`app.componentGallery`)");
  });
});
