import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { compileThemeVars, resolveThemeInputs } from "@dialmade/doc";
import { pairingForDoc } from "../lib/themeVars";
import { acmeDoc } from "../testing/fixtures";
import { ThemeStyles, themeStyle } from "./ThemeStyles";

describe("ThemeStyles", () => {
  const doc = acmeDoc();
  const vars = compileThemeVars(doc, { ...resolveThemeInputs(doc), mode: "dark" });
  const pairing = pairingForDoc(doc);

  it("aplica todas las variables de compileThemeVars al contenedor", () => {
    const { container } = render(
      <ThemeStyles vars={vars} mode="dark" pairing={pairing}>
        <p>hola</p>
      </ThemeStyles>,
    );
    const root = container.querySelector(".dl-theme") as HTMLElement;
    expect(root.getAttribute("data-dl-mode")).toBe("dark");
    expect(root.style.colorScheme).toBe("dark");
    expect(Object.keys(themeStyle(vars))).toHaveLength(Object.keys(vars).length);
    for (const name of ["--primary", "--background", "--dl-radius-md", "--dl-card-border", "--dl-font-heading", "--color-brand-500"]) {
      expect(root.style.getPropertyValue(name), name).toBe(vars[name]);
    }
    expect(screen.getByText("hola")).toBeTruthy();
  });

  it("enlaza las fuentes del pairing salvo que se pida lo contrario", () => {
    const { container, rerender } = render(<ThemeStyles vars={vars} pairing={pairing} />);
    expect(container.querySelector("link")?.getAttribute("href")).toBe(pairing.googleFontsUrl);
    rerender(<ThemeStyles vars={vars} pairing={pairing} fontsHref={null} />);
    expect(container.querySelector("link")).toBeNull();
    rerender(<ThemeStyles vars={vars} fontsHref="https://fonts.googleapis.com/css2?family=Inter&display=swap" />);
    expect(container.querySelector("link")?.getAttribute("rel")).toBe("stylesheet");
  });

  it("descarta nombres o valores inseguros", () => {
    expect(themeStyle({ "--ok": "1px", "not-a-var": "red", "--bad": "red;}body{display:none", "--empty": " ", "--x": "</style>" })).toEqual({
      "--ok": "1px",
    });
  });

  it("se renderiza en el servidor sin avisos", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const html = renderToStaticMarkup(<ThemeStyles vars={vars} pairing={pairing} as="main" />);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(html).toMatch(/^<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com/);
    expect(html).toContain('<main class="dl-theme" data-dl-mode="light" style="--background:');
  });
});
