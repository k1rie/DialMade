import { describe, expect, it } from "vitest";
import { buildPageFromLayout } from "./buildPageFromLayout";
import { countedList } from "./lib/visible";
import { sectionRegistry } from "./registry";
import { acmeContent } from "./testing/fixtures";
import { everyBlockLayout } from "./testing/layout";
import { visibleFields } from "./ui/content";
import { visibleProps } from "./visibleProps";

const ctx = acmeContent();

describe("visibleProps", () => {
  it("cuts counted lists like the components do", () => {
    const cut = countedList("items");
    expect(cut({ items: [1, 2, 3, 4], count: 2 })).toEqual({ items: [1, 2], count: 2 });
    expect(cut({ items: [1, 2], count: 0 })).toEqual({ items: [1], count: 0 });
    expect(countedList("links", "linkCount", 0)({ links: ["a", "b"], linkCount: 0 })).toEqual({ links: [], linkCount: 0 });
    // Invalid stored props are left alone.
    expect(cut({ items: "x", count: 1 })).toEqual({ items: "x", count: 1 });
    expect(cut({ items: [1, 2], count: "2" })).toEqual({ items: [1, 2], count: "2" });
  });

  it("returns a copy for unknown types and sections without the hook", () => {
    const props = { title: "Hola" };
    const out = visibleProps({ type: "nope.nope", props });
    expect(out).toEqual(props);
    expect(out).not.toBe(props);
    expect(visibleProps({ type: "landing.hero", props })).toEqual(props);
  });

  it("form: the purpose's fields in its order, cut to count", () => {
    const def = sectionRegistry.get("ui.form")!;
    const stored = { ...def.defaultProps(ctx), purpose: "login", count: 2 };
    const out = visibleProps({ type: "ui.form", props: stored });
    expect(out.fields).toEqual(visibleFields(stored.fields as { id: string }[], "login", 2));
    expect((out.fields as unknown[]).length).toBe(2);
  });

  it("text: body and action go when their flags hide them", () => {
    const def = sectionRegistry.get("ui.text")!;
    const stored = { ...def.defaultProps(ctx), showBody: false, showAction: false };
    const out = visibleProps({ type: "ui.text", props: stored });
    expect(out).not.toHaveProperty("body");
    expect(out).not.toHaveProperty("action");
    expect(out.title).toBe(stored.title);
  });

  it("never adds keys or lengthens lists, on every element of compiled layouts", () => {
    for (const kind of ["landing", "app"] as const) {
      const { page } = buildPageFromLayout(everyBlockLayout(kind), kind, kind === "app" ? { nav: "sidebar", header: true } : null, ctx);
      let cut = 0;
      for (const element of Object.values(page.elements)) {
        const out = visibleProps(element);
        for (const key of Object.keys(out)) expect(Object.hasOwn(element.props, key), `${element.type}.${key}`).toBe(true);
        for (const [key, value] of Object.entries(out)) {
          const stored = element.props[key];
          if (Array.isArray(value) && Array.isArray(stored)) {
            expect(value.length).toBeLessThanOrEqual(stored.length);
            if (value.length < stored.length) cut++;
          }
        }
      }
      // Layout pages store repeatable lists at their maximum: some of them are always cut.
      expect(cut, kind).toBeGreaterThan(0);
    }
  });
});
