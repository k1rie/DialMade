import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Page } from "@dialmade/doc";
import { mulberry32, realisticLayout } from "@dialmade/layout/testing";
import { buildPageFromLayout } from "../buildPageFromLayout";
import { createRegistry, sectionRegistry } from "../registry";
import { acmeContent, acmeDoc } from "../testing/fixtures";
import { everyBlockLayout } from "../testing/layout";
import type { AnySectionDefinition } from "../types";
import { PageRenderer } from "./PageRenderer";

/*
 * Review B #22: every selection click re-rendered every section of the page (the selection lived in the shared
 * `ctx`). Now only the two frames change; a section re-renders when its element, `ctx` or content does.
 */

/** The real registry with each section's renders counted by element id. */
function countingRegistry() {
  const renders = new Map<string, number>();
  const defs = sectionRegistry.list().map(
    (def): AnySectionDefinition => ({
      ...def,
      Component: (props) => {
        renders.set(props.elementId, (renders.get(props.elementId) ?? 0) + 1);
        const Section = def.Component;
        return <Section {...props} />;
      },
    }),
  );
  return { registry: createRegistry(defs), renders, total: () => [...renders.values()].reduce((a, b) => a + b, 0) };
}

const appPage = (): Page => buildPageFromLayout(everyBlockLayout("app"), "app", { nav: "sidebar", header: true }, acmeContent()).page;

describe("PageRenderer memo", () => {
  it("a new selection re-renders no section, only moves data-dl-selected", () => {
    const { registry, renders, total } = countingRegistry();
    const doc = acmeDoc();
    const page = appPage();
    const onSelect = () => {};
    const view = render(<PageRenderer doc={doc} kind="app" page={page} registry={registry} interactive onSelect={onSelect} selectedId="x-text" />);
    expect(total()).toBeGreaterThan(10);
    expect(view.container.querySelector('[data-dl-selected]')?.getAttribute("data-dl-id")).toBe("x-text");
    renders.clear();
    view.rerender(<PageRenderer doc={doc} kind="app" page={page} registry={registry} interactive onSelect={onSelect} selectedId="x-cards" />);
    expect(view.container.querySelector('[data-dl-selected]')?.getAttribute("data-dl-id")).toBe("x-cards");
    // Containers (root, shell, scope, regions) re-render with their children; no leaf does.
    const leaves = [...renders.keys()].filter((id) => page.elements[id]!.children.length === 0);
    expect(leaves).toEqual([]);
    view.rerender(<PageRenderer doc={doc} kind="app" page={page} registry={registry} interactive onSelect={onSelect} />);
    expect(view.container.querySelector('[data-dl-selected]')).toBeNull();
  });

  it("an edit that keeps the other elements' objects re-renders only the edited section", () => {
    const { registry, renders } = countingRegistry();
    const doc = acmeDoc();
    const page = appPage();
    const view = render(<PageRenderer doc={doc} kind="app" page={page} registry={registry} interactive />);
    renders.clear();
    const edited: Page = {
      ...page,
      elements: { ...page.elements, "x-text": { ...page.elements["x-text"]!, props: { ...page.elements["x-text"]!.props, title: "Nuevo título" } } },
    };
    view.rerender(<PageRenderer doc={doc} kind="app" page={edited} registry={registry} interactive />);
    expect(view.container.textContent).toContain("Nuevo título");
    const leaves = [...renders.keys()].filter((id) => edited.elements[id]!.children.length === 0);
    expect(leaves).toEqual(["x-text"]);
  });

  it("a new document still re-renders every section (sections may read ctx.doc)", () => {
    const { registry, renders } = countingRegistry();
    const page = appPage();
    const view = render(<PageRenderer doc={acmeDoc()} kind="app" page={page} registry={registry} />);
    const first = new Map(renders);
    renders.clear();
    view.rerender(<PageRenderer doc={acmeDoc()} kind="app" page={page} registry={registry} />);
    expect(new Set(renders.keys())).toEqual(new Set(first.keys()));
  });

  it("perf: selecting another section on a 200-block screen (logged)", () => {
    const layout = realisticLayout(mulberry32(1000), 200);
    const page = buildPageFromLayout(layout, "app", { nav: "sidebar", header: true }, acmeContent()).page;
    const doc = acmeDoc();
    const ids = Object.keys(layout.blocks).filter((id) => page.elements[id]);
    const onSelect = () => {};
    const view = render(<PageRenderer doc={doc} kind="app" page={page} interactive onSelect={onSelect} selectedId={ids[0]} />);
    const times: number[] = [];
    for (let i = 1; i <= 9; i++) {
      const start = performance.now();
      act(() => view.rerender(<PageRenderer doc={doc} kind="app" page={page} interactive onSelect={onSelect} selectedId={ids[i]} />));
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    // Reference: what every selection cost before (a new ctx re-renders every section), here with a new doc.
    const full: number[] = [];
    for (let i = 1; i <= 9; i++) {
      const start = performance.now();
      act(() => view.rerender(<PageRenderer doc={{ ...doc }} kind="app" page={page} interactive onSelect={onSelect} selectedId={ids[i]} />));
      full.push(performance.now() - start);
    }
    full.sort((a, b) => a - b);
    // An edit that keeps the other elements (applyPatch shares them now) with the same ctx: only that section.
    const edit: number[] = [];
    let current = page;
    for (let i = 1; i <= 9; i++) {
      const id = ids[i]!;
      current = { ...current, elements: { ...current.elements, [id]: { ...current.elements[id]!, props: { ...current.elements[id]!.props, title: `T${i}` } } } };
      const next = current;
      const start = performance.now();
      act(() => view.rerender(<PageRenderer doc={doc} kind="app" page={next} interactive onSelect={onSelect} selectedId={ids[9]} />));
      edit.push(performance.now() - start);
    }
    edit.sort((a, b) => a - b);
    console.info(
      `[perf] ${ids.length} blocks (jsdom, render + commit): selection change ${times[4]!.toFixed(1)} ms; ` +
        `one element edited, same ctx ${edit[4]!.toFixed(1)} ms; every section re-rendered (new ctx) ${full[4]!.toFixed(1)} ms`,
    );
    expect(view.container.querySelector('[data-dl-selected]')?.getAttribute("data-dl-id")).toBe(ids[9]);
  });
});
