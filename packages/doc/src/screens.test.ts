import { ELEMENT_ID_RE, inferStructure, toAsciiWireframe, toCss } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { LAYOUT_PAGE_ID, MAX_SCREENS, POINTER_ROOTS } from "./constants";
import { addPage, createDesignDoc, effectiveDials, migrateDesignDoc, parseDesignDoc, safeParseDesignDoc } from "./doc";
import { cloneJson } from "./json";
import { applyPatch, lock, type PatchResult } from "./patch";
import {
  DesignDocSchema,
  DocPointerSchema,
  ElementIdSchema,
  LockPointerSchema,
  RouteSchema,
  checkScreenPage,
  type DesignDoc,
  type Page,
  type ScreenInput,
} from "./schema";
import { hasDesign, hasScreens, orderedScreens, pageForKey, removeScreenOps, renderTargets, screenPointer } from "./screens";
import { acmeDoc, acmeInput, screensDoc, screensInput } from "./testing/fixtures";

type Mutable = Record<string, any>;

function issuesOf(doc: unknown): { path: string; message: string; params?: Record<string, unknown> }[] {
  const result = safeParseDesignDoc(doc);
  return result.success
    ? []
    : result.issues.map((issue) => ({
        path: issue.path.join("/"),
        message: issue.message,
        ...("params" in issue && issue.params ? { params: issue.params as Record<string, unknown> } : {}),
      }));
}

const paths = (doc: unknown) => issuesOf(doc).map((issue) => issue.path);

function mutate(fn: (doc: Mutable) => void): Mutable {
  const doc = cloneJson(screensDoc()) as Mutable;
  fn(doc);
  return doc;
}

function expectOk(result: PatchResult): DesignDoc {
  if (!result.ok) throw new Error(`${result.error.reason}: ${result.error.message} ${JSON.stringify(result.error.issues ?? [])}`);
  return result.doc;
}

const HOME = "screens/s-home";
const block = (id: string) => `${HOME}/layout/blocks/${id}`;

describe("DesignDoc v2: screens are valid", () => {
  it("accepts the fixture: three screens in order, the style guide, no landing/app pages", () => {
    const doc = screensDoc();
    expect(doc.version).toBe(2);
    expect(doc.screenOrder).toEqual(["s-home", "s-dash", "s-settings"]);
    expect(Object.keys(doc.screens)).toEqual(["s-home", "s-dash", "s-settings"]);
    expect(Object.keys(doc.pages)).toEqual(["brand"]);
    expect(DesignDocSchema.parse(doc)).toEqual(doc);
    expect(parseDesignDoc(cloneJson(doc))).toEqual(doc);
  });

  it("createDesignDoc writes screens in the given order", () => {
    const doc = createDesignDoc({ ...screensInput, screens: [...screensInput.screens!].reverse() });
    expect(doc.screenOrder).toEqual(["s-settings", "s-dash", "s-home"]);
    expect(orderedScreens(doc).map((screen) => screen.name)).toEqual(["Ajustes", "Dashboard", "Inicio"]);
  });

  it.each([
    ["app sections on a landing screen (critique #1)", (d: Mutable) => (d.screens["s-home"].page.elements["b-list"].type = "app.activity")],
    ["landing sections on an app screen", (d: Mutable) => (d.screens["s-dash"].page.elements["b-e"].type = "landing.cta")],
    ["no catalog lookup for the screen page layoutId", (d: Mutable) => expect(d.screens["s-home"].page.layoutId).toBe(LAYOUT_PAGE_ID)],
    ["an app screen without navigation", (d: Mutable) => (d.screens["s-settings"].shell = { nav: "none", header: false })],
    ["a nav \"none\" next to a sidebar (only real navigations are shared)", (d: Mutable) => (d.screens["s-settings"].shell.nav = "none")],
    ["a self link", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-nav"].linkTo = "s-home")],
    ["page dials on a screen", (d: Mutable) => (d.screens["s-dash"].page.dials = { density: 8 })],
    ["an empty layout and a bare page", (d: Mutable) => {
      d.screens["s-settings"].layout.blocks = {};
      d.screens["s-settings"].page.elements = { root: { type: "app.page", props: {}, children: [] } };
      delete d.screens["s-home"].layout.blocks["b-cta"].linkTo;
      delete d.screens["s-dash"].layout.blocks["b-d"].linkTo;
    }],
    ["routes with nested slug segments", (d: Mutable) => (d.screens["s-settings"].route = "/app/ajustes-2")],
    ["block extras: pinned pointers, fingerprint, responsive overrides", (d: Mutable) => {
      const b = d.screens["s-home"].layout.blocks["b-cal"];
      b.pinned = ["/title", "/items/2/title", "/a~1b"];
      b.generated = { type: "calendar", w: 8, h: 50, variant: "week", noteHash: "1x2y3z" };
      b.responsive = { tablet: { hidden: true }, mobile: { behavior: "agenda", order: 2 } };
    }],
    ["an activeItem in the shell", (d: Mutable) => (d.screens["s-dash"].shell.activeItem = "s-dash")],
    ["MAX_SCREENS screens", (d: Mutable) => {
      for (let i = 0; i < MAX_SCREENS - 3; i++) {
        const copy = cloneJson(d.screens["s-settings"]);
        copy.id = `s-x${i}`;
        copy.route = `/x-${i}`;
        d.screens[copy.id] = copy;
        d.screenOrder.push(copy.id);
      }
    }],
  ])("accepts %s", (_name, fn) => {
    expect(issuesOf(mutate(fn))).toEqual([]);
  });

  it("keeps LayoutDoc ids in sync with @dialmade/layout (same pattern)", () => {
    for (const id of ["b-abc123", "hero-1", "A", "x_y", "a".repeat(64), "a".repeat(65), "-a", "a b", "á", "", "r-1"]) {
      expect(ElementIdSchema.safeParse(id).success, id).toBe(ELEMENT_ID_RE.test(id));
    }
  });

  it("hands screen.layout straight to the engine (same types)", () => {
    const layout = screensDoc().screens["s-dash"]!.layout;
    const structure = inferStructure(layout);
    expect(structure.order).toEqual(["b-kpis", "b-a", "b-b", "b-c", "b-d", "b-e", "b-f"]);
    expect(toCss(layout, { kind: "app", structure })).toContain("grid-template-areas");
    expect(toAsciiWireframe(layout)).toContain("KPIs");
  });
});

describe("DesignDoc v2: screens rules", () => {
  it.each([
    // Document rules.
    ["record key ≠ screen id", (d: Mutable) => {
      d.screens["s-x"] = d.screens["s-home"];
      delete d.screens["s-home"];
      d.screenOrder[0] = "s-x";
    }, "screens/s-x/id"],
    ["a reserved screen id", (d: Mutable) => {
      d.screens.brand = { ...d.screens["s-home"], id: "brand" };
      delete d.screens["s-home"];
      d.screenOrder[0] = "brand";
    }, "screens/brand/id"],
    ["screenOrder with a duplicate", (d: Mutable) => d.screenOrder.push("s-home"), "screenOrder/3"],
    ["screenOrder with an unknown screen", (d: Mutable) => d.screenOrder.push("s-nope"), "screenOrder/3"],
    ["a screen missing from screenOrder", (d: Mutable) => d.screenOrder.pop(), "screens/s-settings"],
    ["screenOrder longer than MAX_SCREENS", (d: Mutable) => (d.screenOrder = Array.from({ length: MAX_SCREENS + 1 }, (_, i) => `s-${i}`)), "screenOrder"],
    ["more than MAX_SCREENS screens", (d: Mutable) => {
      for (let i = 0; i < MAX_SCREENS - 2; i++) {
        const copy = { ...cloneJson(d.screens["s-settings"]), id: `s-x${i}`, route: `/x-${i}` };
        d.screens[copy.id] = copy;
      }
    }, "screens"],
    ["a duplicate route (the later screen is reported)", (d: Mutable) => (d.screens["s-settings"].route = "/dashboard"), "screens/s-settings/route"],
    ["app screens with different navigations", (d: Mutable) => (d.screens["s-settings"].shell.nav = "topnav"), "screens/s-settings/shell/nav"],
    ["a link to a missing screen", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-nav"].linkTo = "s-nope"), `${block("b-nav")}/linkTo`],
    ["pages.landing beside screens", (d: Mutable) => (d.pages.landing = cloneJson(acmeDoc().pages.landing)), "pages/landing"],
    ["pages.app beside screens", (d: Mutable) => (d.pages.app = cloneJson(acmeDoc().pages.app)), "pages/app"],
    ["pages.landing with screens listed but none defined", (d: Mutable) => {
      d.screens = {};
      d.pages.landing = cloneJson(acmeDoc().pages.landing);
    }, "pages/landing"],
    // Screen members.
    ["an unknown screen member", (d: Mutable) => (d.screens["s-home"].extra = true), HOME],
    ["an unknown kind", (d: Mutable) => (d.screens["s-home"].kind = "mobile"), `${HOME}/kind`],
    ["a blank name", (d: Mutable) => (d.screens["s-home"].name = ""), `${HOME}/name`],
    ["a name longer than 60", (d: Mutable) => (d.screens["s-home"].name = "a".repeat(61)), `${HOME}/name`],
    ["a multi-line name", (d: Mutable) => (d.screens["s-home"].name = "In\nicio"), `${HOME}/name`],
    ["a name with bidi controls", (d: Mutable) => (d.screens["s-home"].name = "Ini‮cio"), `${HOME}/name`],
    ["a name with zero-width characters", (d: Mutable) => (d.screens["s-home"].name = "Ini​cio"), `${HOME}/name`],
    ["a name that is not trimmed", (d: Mutable) => (d.screens["s-home"].name = " Inicio"), `${HOME}/name`],
    ["an app screen without shell", (d: Mutable) => (d.screens["s-dash"].shell = null), "screens/s-dash/shell"],
    ["a landing screen with a shell", (d: Mutable) => (d.screens["s-home"].shell = { nav: "none", header: false }), `${HOME}/shell`],
    ["a missing shell", (d: Mutable) => delete d.screens["s-home"].shell, `${HOME}/shell`],
    ["an unknown nav", (d: Mutable) => (d.screens["s-dash"].shell.nav = "bottom"), "screens/s-dash/shell/nav"],
    ["an unknown shell member", (d: Mutable) => (d.screens["s-dash"].shell.width = 200), "screens/s-dash/shell"],
    ["a multi-line activeItem", (d: Mutable) => (d.screens["s-dash"].shell.activeItem = "a\nb"), "screens/s-dash/shell/activeItem"],
    // Screen page.
    ["a page kind ≠ screen kind", (d: Mutable) => (d.screens["s-home"].page.kind = "app"), `${HOME}/page/kind`],
    ["a page with a catalog layoutId", (d: Mutable) => (d.screens["s-home"].page.layoutId = "minimal"), `${HOME}/page/layoutId`],
    ["a root that is not landing.page", (d: Mutable) => (d.screens["s-home"].page.elements.root.type = "app.page"), `${HOME}/page/elements/root/type`],
    ["a brand element in a screen page", (d: Mutable) => (d.screens["s-home"].page.elements["b-cal"].type = "brand.palette"), `${HOME}/page/elements/b-cal/type`],
    ["an unknown namespace", (d: Mutable) => (d.screens["s-dash"].page.elements["b-e"].type = "kit.text"), "screens/s-dash/page/elements/b-e/type"],
    ["a hidden id that does not exist", (d: Mutable) => d.screens["s-home"].page.hidden.push("b-gone"), `${HOME}/page/hidden/1`],
    ["the root hidden", (d: Mutable) => d.screens["s-home"].page.hidden.push("root"), `${HOME}/page/hidden/1`],
    ["an unreachable element", (d: Mutable) => (d.screens["s-home"].page.elements.lost = { type: "ui.text", props: {}, children: [] }), `${HOME}/page/elements/lost`],
    ["two parents", (d: Mutable) => d.screens["s-home"].page.elements.layout.children.push("b-cal"), `${HOME}/page/elements/r-row/children/0`],
    ["a missing root element", (d: Mutable) => (d.screens["s-home"].page.root = "nope"), `${HOME}/page/root`],
    ["props that are not JSON", (d: Mutable) => (d.screens["s-home"].page.elements["b-hero"].props.title = { bind: "brand.logo" }), `${HOME}/page/elements/b-hero/props/title`],
    // Layout (Zod types).
    ["a layout version ≠ 1", (d: Mutable) => (d.screens["s-home"].layout.version = 2), `${HOME}/layout/version`],
    ["a layout with 8 columns", (d: Mutable) => (d.screens["s-home"].layout.columns = 8), `${HOME}/layout/columns`],
    ["a layout row unit ≠ 8", (d: Mutable) => (d.screens["s-home"].layout.rowUnit = 4), `${HOME}/layout/rowUnit`],
    ["an unknown block type", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-cal"].type = "carousel3d"), `${block("b-cal")}/type`],
    ["an empty label", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-cal"].label = ""), `${block("b-cal")}/label`],
    ["a label with a control character", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-cal"].label = "Cal\tendario"), `${block("b-cal")}/label`],
    ["a note with invisible characters", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-cal"].note = "sema⁦nal"), `${block("b-cal")}/note`],
    ["an empty note", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-cal"].note = ""), `${block("b-cal")}/note`],
    ["an invalid block id", (d: Mutable) => (d.screens["s-home"].layout.blocks["bad id"] = d.screens["s-home"].layout.blocks["b-cal"]), `${HOME}/layout/blocks/bad id`],
    ["an unknown block member", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-cal"].color = "red"), block("b-cal")],
    ["a string rect value", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-cal"].rect.col = "0"), `${block("b-cal")}/rect/col`],
    ["a pinned key that is not a pointer", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-cal"].pinned = ["title"]), `${block("b-cal")}/pinned/0`],
    ["pinned duplicates", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-cal"].pinned = ["/title", "/title"]), `${block("b-cal")}/pinned`],
    ["too many pinned props", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-cal"].pinned = Array.from({ length: 129 }, (_, i) => `/p${i}`)), `${block("b-cal")}/pinned`],
    ["a fingerprint with a bad variant", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-feat"].generated.variant = "two words"), `${block("b-feat")}/generated/variant`],
    ["a fingerprint with an uppercase hash", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-feat"].generated.noteHash = "ABC"), `${block("b-feat")}/generated/noteHash`],
    ["a fingerprint wider than the grid", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-feat"].generated.w = 13), `${block("b-feat")}/generated/w`],
    ["an unknown mobile behavior", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-list"].responsive.mobile.behavior = "fly"), `${block("b-list")}/responsive/mobile/behavior`],
    ["a linkTo that is not an id", (d: Mutable) => (d.screens["s-home"].layout.blocks["b-nav"].linkTo = "/dashboard"), `${block("b-nav")}/linkTo`],
  ])("rejects %s", (_name, fn, path) => {
    expect(paths(mutate(fn))).toContain(path);
  });

  it.each([
    // validateLayout rules, mapped with their engine code.
    ["a rect outside the 12 columns", (b: Mutable) => (b["b-cal"].rect = { col: 11, row: 118, w: 2, h: 50 }), "b-cal/rect", "invalid-rect"],
    ["a row past MAX_ROW", (b: Mutable) => (b["b-cal"].rect.row = 4001), "b-cal/rect", "invalid-rect"],
    ["a height past MAX_HEIGHT_ROWS", (b: Mutable) => (b["b-cal"].rect.h = 2001), "b-cal/rect", "invalid-rect"],
    ["a fractional rect", (b: Mutable) => (b["b-cal"].rect.w = 7.5), "b-cal/rect", "invalid-rect"],
    ["a negative rect", (b: Mutable) => (b["b-cal"].rect.col = -1), "b-cal/rect", "invalid-rect"],
    ["a missing parent", (b: Mutable) => (b["b-cal"].parentId = "b-gone"), "b-cal/parentId", "missing-parent"],
    ["a self parent", (b: Mutable) => (b["b-cal"].parentId = "b-cal"), "b-cal/parentId", "self-parent"],
    ["a parent cycle", (b: Mutable) => {
      b["b-cal"].parentId = "b-list";
      b["b-list"].parentId = "b-cal";
    }, "b-cal/parentId", "cycle"],
    ["a count past the repeatable max", (b: Mutable) => (b["b-feat"].count = 7), "b-feat/count", "invalid-count"],
    ["a fractional count", (b: Mutable) => (b["b-cal"].count = 1.5), "b-cal/count", "invalid-count"],
    ["a label longer than LABEL_MAX", (b: Mutable) => (b["b-cal"].label = "a".repeat(61)), "b-cal/label", "label-too-long"],
    ["a note longer than NOTE_MAX", (b: Mutable) => (b["b-cal"].note = "a".repeat(201)), "b-cal/note", "note-too-long"],
    ["a fractional z", (b: Mutable) => (b["b-cal"].z = 1.5), "b-cal/z", "invalid-z"],
    ["an r- block id", (b: Mutable) => (b["r-x"] = { ...b["b-cal"] }), "r-x", "reserved-id"],
    // The compiled page's own element ids (`buildPageFromLayout`): a block can never take them.
    ["a block id «root»", (b: Mutable) => (b.root = { ...b["b-cal"] }), "root", "reserved-id"],
    ["a block id «shell»", (b: Mutable) => (b.shell = { ...b["b-cal"] }), "shell", "reserved-id"],
    ["a block id «layout»", (b: Mutable) => (b.layout = { ...b["b-cal"] }), "layout", "reserved-id"],
  ])("rejects %s (validateLayout)", (_name, fn, at, code) => {
    const issues = issuesOf(mutate((d) => fn(d.screens["s-home"].layout.blocks)));
    const issue = issues.find((i) => i.path === `${HOME}/layout/blocks/${at}`);
    expect(issue, JSON.stringify(issues)).toBeDefined();
    expect(issue!.params).toEqual({ layoutCode: code });
    // One problem, one issue: the Zod types do not repeat what validateLayout says.
    expect(issues.filter((i) => i.path === issue!.path)).toHaveLength(1);
  });

  it("rejects more than MAX_BLOCKS blocks", () => {
    const issues = issuesOf(
      mutate((d) => {
        const blocks: Mutable = {};
        for (let i = 0; i < 201; i++) blocks[`b-${i}`] = { type: "text", label: `T${i}`, rect: { col: 0, row: i * 4, w: 12, h: 4 }, z: i };
        d.screens["s-settings"].layout.blocks = blocks;
        delete d.screens["s-home"].layout.blocks["b-cta"].linkTo;
      }),
    );
    expect(issues).toContainEqual(expect.objectContaining({ path: "screens/s-settings/layout/blocks", params: { layoutCode: "too-many-blocks" } }));
  });

  it("reports an unknown type and an invalid id once (Zod), not again from validateLayout", () => {
    const issues = issuesOf(mutate((d) => (d.screens["s-home"].layout.blocks["b-cal"].type = "nope")));
    expect(issues.filter((i) => i.path.startsWith(block("b-cal")))).toHaveLength(1);
  });

  it.each([
    ["/", true],
    ["/precios", true],
    ["/app/ajustes-2", true],
    [`/${"a".repeat(95)}`, true],
    [`/${"a".repeat(96)}`, false],
    ["", false],
    ["precios", false],
    ["/Precios", false],
    ["/precios/", false],
    ["//precios", false],
    ["/a//b", false],
    ["/-a", false],
    ["/a-", false],
    ["/a--b", false],
    ["/..", false],
    ["/a%20b", false],
    ["/a b", false],
    ["/ñandú", false],
    ["/index.html", false],
  ])("RouteSchema %j → %s", (route, ok) => {
    expect(RouteSchema.safeParse(route).success).toBe(ok);
  });
});

describe("checkScreenPage", () => {
  const page = () => cloneJson(screensDoc().screens["s-home"]!.page) as Page;

  it("is empty for a valid screen page", () => {
    expect(checkScreenPage(page(), "landing")).toEqual([]);
    expect(checkScreenPage(screensDoc().screens["s-dash"]!.page, "app")).toEqual([]);
  });

  it("formats each problem as `/path message`", () => {
    const bad = page();
    bad.elements["b-cal"]!.type = "brand.palette";
    expect(checkScreenPage(bad, "landing")).toEqual([
      '/elements/b-cal/type A screen page only admits "landing.*", "app.*" and "ui.*" elements, got "brand.palette"',
    ]);
    expect(checkScreenPage(page(), "app")).toEqual([
      '/kind A app screen needs a app page, got "landing"',
      '/elements/root/type The root of a app screen page is "app.page", got "landing.page"',
    ]);
  });

  it("reports the page members first when the shape is wrong", () => {
    expect(checkScreenPage({ kind: "landing", layoutId: "custom", elements: {} }, "landing")).toEqual(["/root Invalid input: expected string, received undefined"]);
    expect(checkScreenPage(null, "landing")).toHaveLength(1);
  });
});

describe("migrateDesignDoc", () => {
  const v1 = () => ({ ...cloneJson(acmeDoc()), version: 1 }) as Mutable;

  it("bumps a v1 document to v2 without touching anything else", () => {
    const input = v1();
    delete input.screens;
    delete input.screenOrder;
    const before = cloneJson(input);
    const migrated = migrateDesignDoc(input) as Mutable;
    expect(input).toEqual(before);
    expect(migrated).toEqual({ ...before, version: 2 });
    expect(Object.keys(migrated)[0]).toBe("version");
  });

  it("parses v1 through the migration: screens {} and screenOrder []", () => {
    const input = v1();
    delete input.screens;
    delete input.screenOrder;
    const doc = parseDesignDoc(input);
    expect(doc).toEqual(acmeDoc());
    expect(doc.screens).toEqual({});
    expect(doc.screenOrder).toEqual([]);
  });

  it("leaves other inputs alone", () => {
    const v2 = acmeDoc();
    expect(migrateDesignDoc(v2)).toBe(v2);
    for (const value of [null, 1, "doc", [], { version: 3 }]) expect(migrateDesignDoc(value)).toBe(value);
  });

  it("does not migrate a v1 document that carries v2 members (it was never valid)", () => {
    const input = { ...cloneJson(screensDoc()), version: 1 };
    expect(migrateDesignDoc(input)).toBe(input);
    expect(paths(input)).toContain("version");
  });

  it("applyPatch is v2-only: no migration there", () => {
    const result = applyPatch(acmeDoc(), [{ op: "replace", path: "/version", value: 1 }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("invalid-document");
  });
});

describe("renderTargets and accessors", () => {
  it("lists the screens in screenOrder, then the style guide", () => {
    const targets = renderTargets(screensDoc());
    expect(targets.map((t) => [t.key, t.kind])).toEqual([
      ["s-home", "landing"],
      ["s-dash", "app"],
      ["s-settings", "app"],
      ["brand", "brand"],
    ]);
    expect(targets[0]!.screen?.route).toBe("/");
    expect(targets[0]!.page).toBe(targets[0]!.screen!.page);
    expect(targets[3]!.screen).toBeUndefined();
  });

  it("follows screenOrder", () => {
    const doc = expectOk(applyPatch(screensDoc(), [{ op: "move", from: "/screenOrder/2", path: "/screenOrder/0" }]));
    expect(renderTargets(doc).map((t) => t.key)).toEqual(["s-settings", "s-home", "s-dash", "brand"]);
  });

  it("keeps today's order for legacy documents (focus first)", () => {
    expect(renderTargets(acmeDoc()).map((t) => t.key)).toEqual(["landing", "brand", "app"]);
    const appFocus = expectOk(applyPatch(acmeDoc(), [{ op: "replace", path: "/brief/focus", value: "app" }]));
    expect(renderTargets(appFocus).map((t) => t.key)).toEqual(["app", "brand", "landing"]);
    expect(renderTargets(createDesignDoc(acmeInput))).toEqual([]);
  });

  it("has a design with screens or with any page", () => {
    const empty = createDesignDoc(acmeInput);
    expect(hasDesign(empty)).toBe(false);
    expect(hasScreens(empty)).toBe(false);
    expect(hasDesign(addPage(empty, "brand"))).toBe(true);
    expect(hasDesign(createDesignDoc(screensInput))).toBe(true);
    expect(hasScreens(screensDoc())).toBe(true);
    expect(hasScreens(acmeDoc())).toBe(false);
  });

  it("finds a page by key", () => {
    const doc = screensDoc();
    expect(pageForKey(doc, "s-dash")).toBe(doc.screens["s-dash"]!.page);
    expect(pageForKey(doc, "brand")).toBe(doc.pages.brand);
    expect(pageForKey(doc, "landing")).toBeUndefined();
    expect(pageForKey(doc, "s-nope")).toBeUndefined();
    expect(pageForKey(doc, "toString")).toBeUndefined();
  });

  it("builds escaped screen pointers", () => {
    expect(screenPointer("s-home")).toBe("/screens/s-home");
    expect(screenPointer("s-home", "layout", "blocks", "b-1", "rect", "w")).toBe("/screens/s-home/layout/blocks/b-1/rect/w");
    expect(screenPointer("s-home", "page", "elements", "b-1", "props", "a/b")).toBe("/screens/s-home/page/elements/b-1/props/a~1b");
  });

  it("merges a screen page's dials (by key or by target)", () => {
    const doc = expectOk(applyPatch(screensDoc(), [{ op: "add", path: "/screens/s-dash/page/dials", value: { density: 8 } }]));
    expect(effectiveDials(doc, "s-dash")).toEqual({ variance: 5, motion: 5, density: 8 });
    expect(effectiveDials(doc, renderTargets(doc)[1]!)).toEqual({ variance: 5, motion: 5, density: 8 });
    expect(effectiveDials(doc, "s-home")).toEqual(doc.brief.dials);
    expect(effectiveDials(doc)).toEqual(doc.brief.dials);
    expect(effectiveDials(acmeDoc(), "app")).toEqual({ variance: 5, motion: 5, density: 7 });
  });
});

describe("removeScreenOps", () => {
  it("removes the screen, its place in screenOrder and the links to it", () => {
    const doc = screensDoc();
    const ops = removeScreenOps(doc, "s-settings");
    expect(ops).toEqual([
      { op: "remove", path: "/screens/s-home/layout/blocks/b-cta/linkTo" },
      { op: "remove", path: "/screens/s-dash/layout/blocks/b-d/linkTo" },
      { op: "remove", path: "/screenOrder/2" },
      { op: "remove", path: "/screens/s-settings" },
    ]);
    const next = expectOk(applyPatch(doc, ops));
    expect(next.screenOrder).toEqual(["s-home", "s-dash"]);
    expect(next.screens["s-home"]!.layout.blocks["b-cta"]!.linkTo).toBeUndefined();
    expect(next.screens["s-home"]!.layout.blocks["b-nav"]!.linkTo).toBe("s-dash");
    expect(next.screens["s-dash"]!.layout.blocks["b-d"]!.linkTo).toBeUndefined();
  });

  it("is empty for a screen that does not exist", () => {
    expect(removeScreenOps(screensDoc(), "s-nope")).toEqual([]);
  });

  it("removing every screen leaves a valid document with the style guide", () => {
    let doc = screensDoc();
    for (const id of [...doc.screenOrder]) doc = expectOk(applyPatch(doc, removeScreenOps(doc, id)));
    expect(doc.screens).toEqual({});
    expect(doc.screenOrder).toEqual([]);
    expect(hasDesign(doc)).toBe(true);
    expect(renderTargets(doc).map((t) => t.key)).toEqual(["brand"]);
  });

  it("needs allowLocked when a lock lives under the screen, and then drops the lock entries", () => {
    const pointer = screenPointer("s-settings", "page", "elements", "b-settings", "props", "title");
    const locked = expectOk(lock(screensDoc(), pointer as `/${string}`));
    expect(locked.brief.locks).toEqual([pointer]);
    const ops = removeScreenOps(locked, "s-settings");
    expect(ops).toContainEqual({ op: "remove", path: "/brief/locks/0" });
    const refused = applyPatch(locked, ops);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.reason).toBe("locked");
    const done = expectOk(applyPatch(locked, ops, { allowLocked: true }));
    expect(done.brief.locks).toEqual([]);
    expect(done.screens["s-settings"]).toBeUndefined();
  });

  it("needs allowLocked to strip a locked link in another screen", () => {
    const pointer = screenPointer("s-home", "layout", "blocks", "b-cta", "linkTo");
    const locked = expectOk(lock(screensDoc(), pointer as `/${string}`));
    const ops = removeScreenOps(locked, "s-settings");
    expect(ops).not.toContainEqual({ op: "remove", path: "/brief/locks/0" });
    const refused = applyPatch(locked, ops);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toMatchObject({ reason: "locked", lock: pointer });
  });
});

describe("locks under /screens", () => {
  const title = screenPointer("s-home", "page", "elements", "b-hero", "props", "title");

  it("accepts /screens pointers for locks and import fields, never /screenOrder", () => {
    expect(POINTER_ROOTS).toContain("screens");
    expect(LockPointerSchema.safeParse(title).success).toBe(true);
    expect(DocPointerSchema.safeParse("/screens/s-home/layout/blocks/b-hero/note").success).toBe(true);
    expect(LockPointerSchema.safeParse("/screenOrder").success).toBe(false);
    expect(LockPointerSchema.safeParse("/screenOrder/0").success).toBe(false);
  });

  it("enforces them like any hard lock", () => {
    const doc = expectOk(lock(screensDoc(), title as `/${string}`));
    const change = [{ op: "replace", path: title, value: "Otro título" }];
    const refused = applyPatch(doc, change);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toMatchObject({ reason: "locked", lock: title });
    expect(expectOk(applyPatch(doc, change, { allowLocked: true })).screens["s-home"]!.page.elements["b-hero"]!.props.title).toBe("Otro título");
  });

  it("allows regenerating a page (one replace) that keeps the locked value", () => {
    const doc = expectOk(lock(screensDoc(), title as `/${string}`));
    const page = cloneJson(doc.screens["s-home"]!.page);
    page.elements["b-hero"]!.props.subtitle = "Nuevo subtítulo";
    const next = expectOk(applyPatch(doc, [{ op: "replace", path: screenPointer("s-home", "page"), value: page }]));
    expect(next.screens["s-home"]!.page.elements["b-hero"]!.props.subtitle).toBe("Nuevo subtítulo");
    page.elements["b-hero"]!.props.title = "Pisado";
    expect(applyPatch(doc, [{ op: "replace", path: screenPointer("s-home", "page"), value: page }]).ok).toBe(false);
  });

  it("blocks removing a locked block's screen element through an ancestor", () => {
    const blockLock = screenPointer("s-home", "layout", "blocks", "b-hero");
    const doc = expectOk(lock(screensDoc(), blockLock as `/${string}`));
    const refused = applyPatch(doc, [{ op: "remove", path: screenPointer("s-home", "layout", "blocks", "b-hero", "note") }]);
    expect(refused.ok).toBe(false);
  });
});

/** A screen with `count` blocks in a 2-column grid (no overlaps) and its page. */
function bigScreen(index: number, count: number): ScreenInput {
  const types = ["text", "media", "cards", "list", "form", "kpis", "chart", "table", "activity", "free"] as const;
  const sections: Record<(typeof types)[number], string> = {
    text: "ui.text",
    media: "ui.media",
    cards: "ui.cards",
    list: "ui.list",
    form: "ui.form",
    kpis: "app.kpiRow",
    chart: "app.chartCard",
    table: "app.dataTable",
    activity: "app.activity",
    free: "ui.placeholder",
  };
  const blocks: ScreenInput["layout"]["blocks"] = {};
  const elements: Page["elements"] = {
    root: { type: "app.page", props: {}, children: ["shell"] },
    shell: { type: "app.shell", props: {}, children: ["layout"] },
    layout: { type: "ui.region", props: { role: "scope" }, children: [] },
  };
  for (let i = 0; i < count; i++) {
    const id = `b-${index}-${i}`;
    const type = types[i % types.length]!;
    blocks[id] = {
      type,
      label: `Bloque ${i}`,
      note: i % 3 === 0 ? `nota ${i}` : undefined,
      rect: { col: (i % 2) * 6, row: Math.floor(i / 2) * 12, w: 6, h: 10 },
      z: i + 1,
      pinned: ["/title"],
      generated: { type, w: 6, h: 10, variant: "default" },
    };
    if (blocks[id]!.note === undefined) delete blocks[id]!.note;
    elements[id] = { type: sections[type], props: { title: `Título ${i}`, items: [{ title: "a" }, { title: "b" }] }, children: [] };
    elements.layout!.children.push(id);
  }
  return {
    id: `s-${index}`,
    name: `Pantalla ${index}`,
    kind: "app",
    route: `/pantalla-${index}`,
    shell: { nav: "sidebar", header: true },
    layout: { version: 1, columns: 12, rowUnit: 8, blocks },
    page: { kind: "app", layoutId: LAYOUT_PAGE_ID, root: "root", elements },
  };
}

describe("performance", () => {
  it("validates 10 screens × 200 blocks quickly", () => {
    const input = cloneJson({ ...createDesignDoc(acmeInput), screens: {}, screenOrder: [] }) as Mutable;
    for (let s = 0; s < 10; s++) {
      const screen = bigScreen(s, 200);
      input.screens[screen.id] = screen;
      input.screenOrder.push(screen.id);
    }
    expect(issuesOf(input)).toEqual([]);
    const times: number[] = [];
    for (let run = 0; run < 7; run++) {
      const start = performance.now();
      safeParseDesignDoc(input);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const median = times[3]!;
    const doc = parseDesignDoc(input);
    const patchStart = performance.now();
    expectOk(applyPatch(doc, [{ op: "replace", path: "/screens/s-0/layout/blocks/b-0-0/rect/h", value: 12 }]));
    const patchMs = performance.now() - patchStart;
    console.info(`safeParseDesignDoc 10×200 blocks: median ${median.toFixed(1)} ms; applyPatch (one knob): ${patchMs.toFixed(1)} ms`);
    // Generous bound for slow CI machines; the measured median is reported above.
    expect(median).toBeLessThan(400);
  });
});
