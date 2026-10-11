import { describe, expect, it } from "vitest";
import { screensDoc } from "../../doc/src/testing/fixtures";
import { AI_SHELL_BAR_ID, AI_SHELL_NAV_ID, chromeBlockInput, chromePieces } from "./chrome";
import { KIT_TYPES, aiPieceIds, screenInput } from "./input";
import { AI_RENDER_SYSTEM_PROMPT } from "./prompt";

const doc = screensDoc();
const dashboard = doc.screens["s-dash"]!;
const shellProps = {
  brandName: "Acme",
  workspace: "Equipo Acme",
  searchPlaceholder: "Buscar…",
  showSearch: true,
  nav: [
    { id: "s-dash", label: "Panel", icon: "home" },
    { id: "s-settings", label: "Ajustes", icon: "settings" },
    { id: "reports", label: "Informes", icon: "chart" },
  ],
  activeId: "s-dash",
  user: { name: "Lucía Pérez", role: "Admin" },
};
const context = { locale: "es" as const, screenIds: new Set(doc.screenOrder), brandName: "Acme" };

describe("the app frame's AI pieces", () => {
  it("a sidebar frame has a sidebar and a top bar; a top nav only its bar; landings and «none» have none", () => {
    expect(chromePieces(dashboard)).toEqual([
      { id: AI_SHELL_NAV_ID, type: "app-sidebar" },
      { id: AI_SHELL_BAR_ID, type: "app-topbar" },
    ]);
    expect(chromePieces({ ...dashboard, shell: { nav: "rail", header: true } })[0]?.type).toBe("app-rail");
    expect(chromePieces({ ...dashboard, shell: { nav: "topnav", header: true } })).toEqual([{ id: AI_SHELL_BAR_ID, type: "app-topnav" }]);
    expect(chromePieces({ ...dashboard, shell: { nav: "none", header: true } })).toEqual([]);
    expect(chromePieces(doc.screens["s-home"]!)).toEqual([]);
  });

  it("sends the frame's copy as the draft and the nav items with the href each one keeps", () => {
    const sidebar = chromeBlockInput({ id: AI_SHELL_NAV_ID, type: "app-sidebar" }, shellProps, context);
    expect(sidebar).toMatchObject({ id: "shell-nav", type: "app-sidebar", label: "Barra lateral", draft: ["Acme", "Equipo Acme", "Lucía Pérez", "Admin"] });
    expect(sidebar.nav?.items).toEqual([
      { label: "Panel", href: "#screen:s-dash", current: true },
      { label: "Ajustes", href: "#screen:s-settings" },
      { label: "Informes", href: "#" },
    ]);
    const bar = chromeBlockInput({ id: AI_SHELL_BAR_ID, type: "app-topbar" }, { ...shellProps, showSearch: false }, context);
    expect(bar.draft).toEqual(["Lucía Pérez"]);
    expect(bar.nav).toBeUndefined();
  });

  it("come first in the screen's input, are kit pieces and can be asked alone", () => {
    expect(aiPieceIds(dashboard).slice(0, 2)).toEqual(["shell-nav", "shell-bar"]);
    const input = screenInput(doc, "s-dash", { draftOf: () => [], shellProps });
    expect(input.blocks.slice(0, 2).map((block) => block.id)).toEqual(["shell-nav", "shell-bar"]);
    expect(input.blocks.filter((block) => block.h1)).toHaveLength(0);
    for (const block of input.blocks.slice(0, 2)) expect(KIT_TYPES.has(block.type)).toBe(true);
    expect(screenInput(doc, "s-dash", { draftOf: () => [], only: new Set(["shell-bar"]) }).blocks.map((block) => block.id)).toEqual(["shell-bar"]);
    expect(screenInput(doc, "s-dash", { draftOf: () => [], skip: new Set(["shell-nav", "shell-bar"]) }).blocks[0]?.id).toBe("b-kpis");
  });

  it("the blocks prompt tells how each piece looks and that nav items keep their href", () => {
    for (const type of ["app-sidebar", "app-rail", "app-topbar", "app-topnav"]) expect(AI_RENDER_SYSTEM_PROMPT).toContain(`"${type}"`);
    expect(AI_RENDER_SYSTEM_PROMPT).toContain('aria-current="page"');
  });
});
