import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { BlankCard } from "./BlankCard";

const markup = renderToStaticMarkup(createElement(I18nProvider, null, createElement(BlankCard, { onChoose: () => {} })));
const attr = (tag: string, name: string) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];
/** The element with `id`, from its opening tag to its first closing tag (the title and the hint are flat spans). */
const byId = (id: string) => new RegExp(`<[a-z]+ [^>]*id="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>([^<]*)<`).exec(markup)?.[1];

describe("BlankCard", () => {
  it("is named by its title and described by its hint, so the hint is not read twice", () => {
    const button = /<button [^>]*>/.exec(markup)?.[0] ?? "";
    const labelledBy = attr(button, "aria-labelledby");
    const describedBy = attr(button, "aria-describedby");
    expect(labelledBy).toBeTruthy();
    expect(describedBy).toBeTruthy();
    expect(labelledBy).not.toBe(describedBy);
    expect(byId(labelledBy!)).toBe("En blanco");
    expect(byId(describedBy!)).toBe("Lienzo vacío. Te preguntamos qué tipo de pantalla es.");
    // The name is the title alone: the hint never makes it into the name.
    expect(labelledBy!.split(" ")).not.toContain(describedBy);
  });
});
