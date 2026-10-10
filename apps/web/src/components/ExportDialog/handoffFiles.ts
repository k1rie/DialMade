// figma-plan and TSX of the export (loaded on demand, like exportPack: @dialmade/handoff builds the design tree
// with the sections' builders). Pure: same document, same files.
import { toFigmaPlan, toTsx, type TsxFiles } from "@dialmade/handoff";
import type { DesignDoc, ThemeInputs } from "@dialmade/doc";

export { FIGMA_PLUGIN_ZIP, HANDOFF_FILES } from "./handoffFiles.constants";

/**
 * `figma-plan.json`: every screen (or page) and the style guide, for the Dialmade Figma plugin. Compact: the tree
 * is deep, and indenting it multiplies its size several times over.
 */
export function figmaPlanJson(doc: DesignDoc, inputs: ThemeInputs): string {
  return `${JSON.stringify(toFigmaPlan(doc, inputs))}\n`;
}

/** React + Tailwind v4 files (path → content), relative to the TSX folder. */
export function tsxFiles(doc: DesignDoc, inputs: ThemeInputs): TsxFiles {
  return toTsx(doc, inputs);
}
