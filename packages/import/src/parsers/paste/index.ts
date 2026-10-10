import { detectedBy, type Parser, type SniffedFile } from "../../registry";
import { scanColors } from "./tokenize";

const DECLARATION = /^--[\w-]+\s*:/;
const COMMENT = /^(?:\/\*.*\*\/|\/\/.*)$/;

/**
 * Pasted text the detector sent to CSS only because one line is `--brand: #…`, while the rest is a
 * labeled list (`Primary: #3A5BD9`): no braces, not a .css file, and not every line a declaration.
 */
function labeledListWithVariables(file: SniffedFile): boolean {
  if (file.detected.parserId !== "css" || file.detected.format !== "css" || file.extension === "css" || file.text === undefined) return false;
  if (file.text.includes("{")) return false;
  const lines = file.text
    .slice(0, 64 * 1024)
    .split(/\r?\n/, 200)
    .map((line) => line.trim().slice(0, 2000))
    .filter((line) => line && !COMMENT.test(line));
  if (lines.length === 0 || lines.every((line) => DECLARATION.test(line))) return false;
  return lines.some((line) => !DECLARATION.test(line) && scanColors(line).colors.length > 0);
}

const claimed = detectedBy("paste");

/** Pasted colors: hex, rgb(), hsl(), oklch(), CSS names, «Primary: #…» lines and Coolors URLs. */
export const pasteParser: Parser = {
  id: "paste",
  kind: "paste",
  version: "1.0.0",
  detect: (file) => claimed(file) ?? (labeledListWithVariables(file) ? { format: "color-list", score: 0.95 } : null),
  parse: (input, ctx) => import("./parse").then((m) => m.parse(input, ctx)),
};
