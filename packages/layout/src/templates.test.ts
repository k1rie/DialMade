import { describe, expect, test } from "vitest";
import { inferStructure } from "./infer";
import { mulberry32 } from "./testing/random";
import { newBlockId } from "./ids";
import { parseNote } from "./note";
import { sanitizeNote } from "./sanitize";
import { getScreenTemplate, getSetTemplate, instantiateTemplate, SCREEN_TEMPLATES, SET_TEMPLATES } from "./templates";
import { validateLayout } from "./validate";
import type { ScreenTemplateId } from "./types";

const label = (type: string) => `Label ${type}`;

describe("templates", () => {
  test("ids and order", () => {
    expect(SCREEN_TEMPLATES.map((t) => t.id)).toEqual([
      "home", "pricing", "login", "dashboard", "settings", "detail", "list", "checkout", "profile", "blank",
    ]);
    expect(SET_TEMPLATES).toEqual([
      { id: "saas-app", screens: ["dashboard", "settings", "login"] },
      { id: "landing", screens: ["home", "pricing"] },
    ]);
    for (const set of SET_TEMPLATES) for (const id of set.screens) expect(getScreenTemplate(id).id).toBe(id);
    expect(getSetTemplate("landing").screens).toEqual(["home", "pricing"]);
    expect(() => getScreenTemplate("nope" as ScreenTemplateId)).toThrow();
  });

  test("kind and shell of each template", () => {
    const shells = Object.fromEntries(SCREEN_TEMPLATES.map((t) => [t.id, [t.kind, t.shell]]));
    expect(shells).toEqual({
      home: ["landing", null],
      pricing: ["landing", null],
      login: ["app", { nav: "none", header: false }],
      dashboard: ["app", { nav: "sidebar", header: true }],
      settings: ["app", { nav: "sidebar", header: true }],
      detail: ["app", { nav: "sidebar", header: true }],
      list: ["app", { nav: "sidebar", header: true }],
      checkout: ["app", { nav: "none", header: false }],
      profile: ["app", { nav: "sidebar", header: true }],
      blank: [null, null],
    });
  });

  test.each(SCREEN_TEMPLATES.map((t) => [t.id, t] as const))("%s instantiates to a valid, warning-free layout", (_id, template) => {
    const rand = mulberry32(3);
    const taken = new Set<string>();
    const { layout, shell, kind } = instantiateTemplate(template, {
      label,
      newId: () => {
        const id = newBlockId(taken, rand);
        taken.add(id);
        return id;
      },
    });
    expect(kind).toBe(template.kind);
    expect(shell).toEqual(template.shell);
    if (shell) expect(shell).not.toBe(template.shell);
    expect(validateLayout(layout)).toEqual([]);
    expect(Object.keys(layout.blocks)).toHaveLength(template.blocks.length);
    const structure = inferStructure(layout);
    expect(structure.warnings).toEqual([]);
    expect(structure.order).toHaveLength(template.blocks.length);
    // Frame blocks never appear in app templates (navigation is the shell there).
    if (kind === "app") for (const block of Object.values(layout.blocks)) expect(["navbar", "sidebar"]).not.toContain(block.type);
    Object.values(layout.blocks).forEach((block) => expect(block.label).toBe(`Label ${block.type}`));
  });

  test("the Login form starts with a note that makes it a sign-in form", () => {
    const { layout } = instantiateTemplate(getScreenTemplate("login"), { label, newId: (() => { let i = 0; return () => `b-${i++}`; })() });
    const form = Object.values(layout.blocks).find((block) => block.type === "form")!;
    expect(form.note).toBe("Login");
    expect(parseNote(form.note).keywords).toEqual(["login"]);
    for (const template of SCREEN_TEMPLATES) {
      for (const tb of template.blocks) if (tb.note !== undefined) expect(sanitizeNote(tb.note)).toBe(tb.note);
    }
  });

  test("blocks keep the template rects, counts and z order", () => {
    const ids = ["k", "c", "a", "t"];
    let i = 0;
    const { layout } = instantiateTemplate(getScreenTemplate("dashboard"), { label, newId: () => ids[i++]! });
    expect(layout.blocks).toEqual({
      k: { type: "kpis", label: "Label kpis", rect: { col: 0, row: 0, w: 12, h: 14 }, z: 1, count: 4 },
      c: { type: "chart", label: "Label chart", rect: { col: 0, row: 16, w: 8, h: 40 }, z: 2 },
      a: { type: "activity", label: "Label activity", rect: { col: 8, row: 16, w: 4, h: 40 }, z: 3 },
      t: { type: "table", label: "Label table", rect: { col: 0, row: 58, w: 12, h: 50 }, z: 4 },
    });
  });

  test("template parents map to the new ids; default ids are fresh b- ids", () => {
    const { layout } = instantiateTemplate(
      {
        id: "blank",
        kind: "landing",
        shell: null,
        blocks: [
          { type: "container", rect: { col: 0, row: 0, w: 12, h: 40 } },
          { type: "text", rect: { col: 1, row: 2, w: 4, h: 20 }, parent: 0 },
        ],
      },
      { label },
    );
    const [parentId, childId] = Object.keys(layout.blocks);
    expect(parentId).toMatch(/^b-[0-9a-z]{6}$/);
    expect(layout.blocks[childId!]!.parentId).toBe(parentId);
    expect(() => instantiateTemplate(getScreenTemplate("login"), { label, newId: () => "same" })).toThrow(/duplicate/);
  });
});
