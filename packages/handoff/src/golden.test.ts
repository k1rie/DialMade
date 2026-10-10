// Golden tests of the figma-plan and the TSX export. Regenerate after an intended change with
// `UPDATE_GOLDEN=1 corepack pnpm --filter @dialmade/handoff test`, then review the diff.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FigmaPlanSchema, type PlanNode } from "./figma/schema";
import { toFigmaPlan } from "./figma/toFigmaPlan";
import { goldenDoc, legacyDoc, screensDoc } from "./testing/fixtures";
import { toTsx } from "./tsx/toTsx";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "__golden__");
const update = process.env.UPDATE_GOLDEN === "1";

function golden(name: string, actual: string) {
  const file = path.join(dir, name);
  if (update || !existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, actual);
    return;
  }
  expect(actual, `${name} changed: run with UPDATE_GOLDEN=1 if it is intended`).toBe(readFileSync(file, "utf8"));
}

const bound = (b: { value: number; variable?: string }) => (b.variable ? `${b.value}@${b.variable}` : String(b.value));
const paint = (p: { type: string; variable?: string; opacity?: number }) =>
  p.type === "SOLID" ? `${p.variable ?? "raw"}${p.opacity !== undefined ? `/${p.opacity}` : ""}` : "gradient";

/** One line per node: type, name, sizing, layout and bindings. Diff-friendly view of a whole plan. */
function outline(node: PlanNode, depth = 0, out: string[] = []): string[] {
  const s = node.sizing;
  const size = `${s.horizontal[0]}${s.horizontal === "FIXED" ? s.width : ""}×${s.vertical[0]}${s.height ?? ""}${s.minHeight ? ` min${s.minHeight}` : ""}${s.maxWidth ? ` max${s.maxWidth}` : ""}`;
  const at = node.absolute ? ` @${node.absolute.x},${node.absolute.y}` : "";
  let line = `${"  ".repeat(depth)}${node.type} "${node.name}" ${size}${at}`;
  if (node.type === "FRAME") {
    const l = node.layout;
    const pad = [l.padding.top, l.padding.right, l.padding.bottom, l.padding.left].map(bound).join(" ");
    line += ` ${l.mode}${l.wrap ? " wrap" : ""} gap ${bound(l.itemSpacing)} pad ${pad} ${l.primaryAxisAlign}/${l.counterAxisAlign}`;
    if (node.fills.length) line += ` fill ${node.fills.map(paint).join(",")}`;
    if (node.stroke) line += ` stroke ${paint(node.stroke.paint)}`;
    if (node.cornerRadius) line += ` r ${bound(node.cornerRadius)}`;
    if (node.effectStyle) line += ` fx ${node.effectStyle}`;
    if (node.navigateTo) line += ` → ${node.navigateTo}`;
    if (node.mode) line += ` mode ${node.mode}`;
  } else if (node.type === "TEXT") {
    line += ` ${node.textStyle} ${paint(node.fill)} "${node.characters.slice(0, 60)}"`;
  } else if (node.type === "ICON") {
    line += ` ${paint(node.color)}`;
  } else {
    line += ` ${node.fills.map(paint).join(",")}${node.cornerRadius ? ` r ${bound(node.cornerRadius)}` : ""}`;
  }
  out.push(line);
  if (node.type === "FRAME") for (const child of node.children) outline(child, depth + 1, out);
  return out;
}

const tsxBundle = (files: Record<string, string>) =>
  Object.entries(files)
    .map(([file, content]) => `===== ${file} =====\n${content}`)
    .join("\n");

describe("golden", () => {
  it("figma-plan of two linked screens (full JSON)", () => {
    const plan = toFigmaPlan(goldenDoc());
    FigmaPlanSchema.parse(plan);
    golden("plan.precios-entrar.json", `${JSON.stringify(plan, null, 1)}\n`);
  });

  it("figma-plan outline of a whole document (5 screens + style guide)", () => {
    const plan = toFigmaPlan(screensDoc());
    golden("plan.screens.outline.txt", `${plan.pages.flatMap((page) => [`# ${page.name} (${page.kind})`, ...outline(page.frame)]).join("\n")}\n`);
  });

  it("figma-plan outline of a document without screens", () => {
    const plan = toFigmaPlan(legacyDoc());
    golden("plan.legacy.outline.txt", `${plan.pages.flatMap((page) => [`# ${page.name} (${page.kind})`, ...outline(page.frame)]).join("\n")}\n`);
  });

  it("TSX of two linked screens", () => {
    golden("tsx.precios-entrar.txt", tsxBundle(toTsx(goldenDoc())));
  });

  it("is deterministic", () => {
    expect(JSON.stringify(toFigmaPlan(screensDoc()))).toBe(JSON.stringify(toFigmaPlan(screensDoc())));
  });
});
