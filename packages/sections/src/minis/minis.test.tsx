import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { contentContextFromDoc } from "../context";
import { acmeDoc } from "../testing/fixtures";
import { MiniApp, MiniBrand, MiniLanding } from ".";

describe("minis", () => {
  it.each([
    ["es", MiniBrand, "Vista previa de Guía de estilo: Acme Cloud"],
    ["es", MiniLanding, "Vista previa de Landing page: Acme Cloud"],
    ["es", MiniApp, "Vista previa de Dashboard y componentes: Acme Cloud"],
    ["en", MiniBrand, "Style guide preview: Acme Cloud"],
    ["en", MiniLanding, "Landing page preview: Acme Cloud"],
    ["en", MiniApp, "Dashboard & components preview: Acme Cloud"],
  ] as const)("%s: %o tiene nombre accesible", (locale, Mini, name) => {
    render(<Mini ctx={contentContextFromDoc(acmeDoc(), { locale })} />);
    expect(screen.getByRole("img", { name })).toBeTruthy();
  });

  it("MiniBrand usa el logo cuando lo hay", () => {
    const ctx = contentContextFromDoc(acmeDoc(), { logoUrl: "blob:logo" });
    const { container } = render(<MiniBrand ctx={ctx} />);
    // Light, dark and brand surfaces.
    expect(container.querySelectorAll('img[src="blob:logo"]')).toHaveLength(3);
  });
});
