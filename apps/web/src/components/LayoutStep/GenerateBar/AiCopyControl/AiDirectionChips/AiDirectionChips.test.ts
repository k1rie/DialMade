import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { AiDirectionChips } from "./AiDirectionChips";

const render = (value: Parameters<typeof AiDirectionChips>[0]["value"]) =>
  renderToStaticMarkup(createElement(I18nProvider, null, createElement(AiDirectionChips, { value, onChange: () => {} })));

describe("AiDirectionChips", () => {
  it("one choice among the six chips, «Automática» by default, one tab stop", () => {
    const markup = render("auto");
    expect(markup).toContain('role="radiogroup"');
    const radios = [...markup.matchAll(/<button[^>]*role="radio"[^>]*>([^<]*)<\/button>/g)];
    expect(radios.map((match) => match[1])).toEqual(["Automática", "Editorial", "Técnica", "Cálida", "Juguetona", "Lujo"]);
    const checked = radios.filter((match) => match[0].includes('aria-checked="true"'));
    expect(checked.map((match) => match[1])).toEqual(["Automática"]);
    expect(radios.filter((match) => match[0].includes('tabindex="0"'))).toHaveLength(1);
    // A radio, not a toggle button.
    expect(markup).not.toContain("aria-pressed");
  });

  it("the chosen chip is the tab stop", () => {
    const markup = render("warm");
    expect(/<button[^>]*tabindex="0"[^>]*>([^<]*)</.exec(markup)?.[1]).toBe("Cálida");
  });
});
