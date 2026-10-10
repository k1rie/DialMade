import { beforeAll, describe, expect, it } from "vitest";
import { toFigmaPlan, type FigmaPlan } from "@dialmade/handoff";
import { screensDoc } from "@dialmade/handoff/testing";
import { FakeFigma, type FakeNode } from "./testing/fakeFigma";
import type { ToUi } from "./lib/messages";

let fake: FakeFigma;
let plan: FigmaPlan;

beforeAll(async () => {
  fake = new FakeFigma();
  Object.assign(globalThis, { figma: fake, __html__: "<html></html>" });
  await import("./code");
  plan = toFigmaPlan(screensDoc());
});

const run = async (options = { dark: true, flow: true }) => {
  fake.messages = [];
  await fake.ui.onmessage!({ type: "create", plan, options });
  return fake.messages as ToUi[];
};

const count = (node: FakeNode): number => 1 + node.children.reduce((sum, child) => sum + count(child), 0);

describe("plugin main thread", () => {
  it("builds the whole plan without errors", async () => {
    const messages = await run();
    const last = messages[messages.length - 1]!;
    if (last.type === "error") throw new Error(last.message);
    expect(last.type).toBe("done");
    if (last.type !== "done") return;
    const { report } = last;
    expect(report.pages).toBe(plan.pages.length);
    expect(report.variables.created).toBe(plan.collections.color.variables.length + plan.collections.tokens.variables.length);
    expect(report.textStyles).toBe(plan.textStyles.length);
    expect(report.links).toBeGreaterThan(0);
    // Inter is in the fake file; any other family of the plan is reported.
    for (const font of plan.fonts) if (font.family !== "Inter") expect(report.missingFonts.join()).toContain(font.family);
  });

  it("creates a page per plan page plus the flow page, with Light/Dark modes", () => {
    const pages = fake.root.children.filter((page) => page.getPluginData("page"));
    expect(pages.map((page) => page.name)).toEqual([...plan.pages.map((p) => p.name), "Flujo (prototipo)"]);
    const color = fake.variables.collections.find((c) => c.name === plan.collections.color.name);
    expect(color.modes.map((m: { name: string }) => m.name)).toEqual(["Light", "Dark"]);
    const home = pages[0]!.children[0]!;
    expect(home.modes.size).toBe(1);
    expect(count(home)).toBeGreaterThan(50);
    // Light and dark versions side by side.
    expect(pages[0]!.children).toHaveLength(2);
  });

  it("binds colors and spacing to variables", () => {
    const home = fake.root.children.find((page) => page.getPluginData("page") === plan.pages[0]!.id)!.children[0]!;
    const bound = home.findAll((node) => (node.fills as { boundVariables?: unknown }[]).some((fill) => fill.boundVariables));
    expect(bound.length).toBeGreaterThan(10);
    expect(home.findAll((node) => node.bound.has("itemSpacing") || node.bound.has("paddingLeft")).length).toBeGreaterThan(5);
  });

  it("replaces its own frames when run again", async () => {
    const before = fake.root.children.length;
    const messages = await run({ dark: false, flow: true });
    expect(messages[messages.length - 1]!.type).toBe("done");
    expect(fake.root.children.length).toBe(before);
    const home = fake.root.children.find((page) => page.getPluginData("page") === plan.pages[0]!.id)!;
    expect(home.children).toHaveLength(1);
    const last = messages[messages.length - 1]!;
    if (last.type === "done") expect(last.report.variables.updated).toBeGreaterThan(0);
  });
});
