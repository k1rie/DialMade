// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Gallery } from "./Gallery";

describe("Gallery en servidor (export HTML)", () => {
  it.each(["es", "en"] as const)("se renderiza sin DOM en %s y solo usa clases dl-", (locale) => {
    const html = renderToStaticMarkup(<Gallery locale={locale} />);
    expect(html.length).toBeGreaterThan(10_000);
    expect(html).toContain('role="tablist"');
    expect(html).toContain("<dialog");
    const classes = [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => (m[1] ?? "").split(/\s+/).filter(Boolean));
    expect(classes.filter((name) => !name.startsWith("dl-"))).toEqual([]);
  });
});
