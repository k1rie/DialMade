import { outputKindOptions, type OutputKind } from "@dialmade/catalog";
import { resolveThemeInputs } from "@dialmade/doc";
import { parseFigmaPlan } from "@dialmade/handoff";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { exportDialog } from "@/i18n/export";
import { buildCodePack, buildTsxPack, type PackInput } from "./exportPack";
import { DESTINATION_ORDER } from "./constants";
import { HANDOFF_FILES, figmaPlanJson } from "./handoffFiles";
import { screensFixture } from "./testing";

const KIT = { ui: ".dl-button{color:red}", sections: ".dl-landing{display:block}" };

function input(): PackInput {
  const { doc } = screensFixture();
  return {
    doc,
    inputs: resolveThemeInputs(doc),
    mode: "light",
    locale: "es",
    kindLabel: (kind: OutputKind) => outputKindOptions.find((option) => option.id === kind)!.label.es,
    texts: exportDialog.es.files,
    css: KIT,
  };
}

describe("Figma and TSX exports", () => {
  it("figma-plan.json is a valid plan with one page per screen plus the style guide", () => {
    const pack = input();
    const plan = parseFigmaPlan(figmaPlanJson(pack.doc, pack.inputs));
    expect(plan.pages.map((page) => page.name)).toEqual([...pack.doc.screenOrder.map((id) => pack.doc.screens[id]!.name), "Guía de estilo"]);
  });

  it("the code ZIP carries figma-plan.json and the TSX folder, and its README lists them", () => {
    const built = buildCodePack(input());
    const root = built.filename.replace(/\.zip$/, "");
    const paths = Object.keys(unzipSync(built.bytes)).map((path) => path.slice(root.length + 1));
    expect(paths).toContain(HANDOFF_FILES.figmaPlan);
    expect(paths).toContain("tsx/src/dialmade.css");
    expect(paths.some((path) => /^tsx\/src\/screens\/\w+Screen\.tsx$/.test(path))).toBe(true);
    const readme = strFromU8(unzipSync(built.bytes)[`${root}/README.md`]!);
    expect(readme).toContain("figma-plan.json");
    expect(readme).toContain("`tsx/`");
  });

  it("the TSX ZIP holds only the React + Tailwind files", () => {
    const built = buildTsxPack(input());
    expect(built.filename).toMatch(/-tsx\.zip$/);
    const files = unzipSync(built.bytes);
    const root = built.filename.replace(/\.zip$/, "");
    expect(Object.keys(files)).toContain(`${root}/README.md`);
    expect(Object.keys(files).every((path) => path.startsWith(`${root}/README.md`) || path.startsWith(`${root}/src/`))).toBe(true);
  });

  it("every focus lists the TSX card once", () => {
    for (const order of Object.values(DESTINATION_ORDER)) expect(order.filter((id) => id === "tsx")).toHaveLength(1);
  });
});
