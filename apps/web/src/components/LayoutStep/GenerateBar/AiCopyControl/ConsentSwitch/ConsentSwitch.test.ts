import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConsentSwitch } from "./ConsentSwitch";

const LABEL = "Escribir los textos con IA al generar";
const render = (disabled = false) =>
  renderToStaticMarkup(
    createElement(
      ConsentSwitch,
      { checked: false, onCheckedChange: () => {}, disabled, label: LABEL },
      createElement("span", null, "$0.01 · 3 usos gratis"),
      createElement("span", null, "Solo los 3 bloques que cambiaron"),
    ),
  );

const attr = (tag: string, name: string) => new RegExp(` ${name}="([^"]*)"`).exec(tag)?.[1];
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Inner HTML of the element with `id` up to its matching close tag (no nested elements of the same tag). */
function inner(markup: string, id: string): string {
  const open = new RegExp(`<([a-z]+) [^>]*id="${escape(id)}"[^>]*>`).exec(markup);
  if (!open) return "";
  const start = open.index + open[0].length;
  return markup.slice(start, markup.indexOf(`</${open[1]}>`, start));
}

describe("ConsentSwitch", () => {
  it("the label names the switch and the description holds only the lines under it", () => {
    const markup = render();
    const control = /<button [^>]*role="switch"[^>]*>/.exec(markup)?.[0] ?? "";
    const labelledBy = attr(control, "aria-labelledby")!;
    const describedBy = attr(control, "aria-describedby")!;
    expect(inner(markup, labelledBy)).toBe(LABEL);
    const description = inner(markup, describedBy);
    expect(description).toContain("3 usos gratis");
    expect(description).toContain("Solo los 3 bloques que cambiaron");
    // The description used to wrap the label too: read twice.
    expect(description).not.toContain(LABEL);
    expect(description).not.toContain(`id="${labelledBy}"`);
  });

  it("the label is a <label> for the switch, so clicking it toggles", () => {
    const markup = render();
    const control = /<button [^>]*role="switch"[^>]*>/.exec(markup)?.[0] ?? "";
    const id = attr(control, "id")!;
    expect(id).toBeTruthy();
    const label = new RegExp(`<label [^>]*for="${escape(id)}"[^>]*>${escape(LABEL)}</label>`).exec(markup)?.[0];
    expect(label).toBeTruthy();
    expect(attr(label!, "id")).toBe(attr(control, "aria-labelledby"));
  });

  it("disabled: the switch is disabled and the label stops looking clickable", () => {
    const markup = render(true);
    expect(/<button [^>]*role="switch"[^>]*>/.exec(markup)?.[0]).toContain("disabled");
    expect(/<label [^>]*>/.exec(markup)?.[0]).not.toContain("cursor-pointer");
    expect(/<label [^>]*>/.exec(render())?.[0]).toContain("cursor-pointer");
  });
});
