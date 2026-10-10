import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { AiCellBadge, type AiCellBadgeProps } from "./AiCellBadge";

const render = (props: AiCellBadgeProps) => renderToStaticMarkup(createElement(I18nProvider, null, createElement(AiCellBadge, props)));

describe("AiCellBadge", () => {
  it("«La IA falló aquí · Reintentar»: a real button whose name says what it spends", () => {
    const markup = render({ kind: "failed", label: "Hero", onAction: () => {} });
    expect(markup).toContain("La IA falló aquí");
    expect(markup).toMatch(/<button type="button" aria-label="Reintentar Hero con IA: gasta 1 cambio de tu sesión"[^>]*>Reintentar<span[^>]*>· 1 cambio<\/span><\/button>/);
    expect(markup).toContain("app-chrome");
  });

  it("the retry's cost is visible, also with the user's key; while it runs the button stays focusable", () => {
    const markup = render({ kind: "failed", label: "Hero", byok: true, busy: true, onAction: () => {} });
    expect(markup).toContain("se cobra a tu key");
    expect(markup).toContain("· con tu key");
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toMatch(/ disabled=""/);
  });

  it("«Usar IA otra vez» on a block sent back to the base design", () => {
    expect(render({ kind: "inactive", label: "Precios" })).toMatch(/aria-label="Usar otra vez el diseño con IA en Precios"[^>]*>Usar IA otra vez</);
  });

  it("the designing shimmer is decorative and click-through", () => {
    const markup = render({ kind: "designing", label: "Hero" });
    expect(markup).toMatch(/^<div aria-hidden="true" class="app-chrome pointer-events-none/);
    expect(markup).not.toContain("<button");
  });
});
