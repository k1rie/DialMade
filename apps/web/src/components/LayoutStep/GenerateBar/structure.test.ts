import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// CLAUDE.md: one folder per component; a subcomponent used by one parent lives in its own folder inside the parent's.
const root = dirname(fileURLToPath(import.meta.url));

function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return componentFiles(path);
    return entry.name.endsWith(".tsx") && !entry.name.includes(".test.") ? [path] : [];
  });
}

/** Top-level components declared in a file: `function Name(` or `const Name = memo(`/`forwardRef(`. */
function declaredComponents(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(/^(?:export\s+)?function\s+([A-Z]\w*)\s*[<(]/gm)) names.add(match[1]!);
  for (const match of source.matchAll(/^(?:export\s+)?const\s+([A-Z]\w*)\s*=\s*(?:memo|forwardRef)\(/gm)) names.add(match[1]!);
  return [...names];
}

describe("GenerateBar folder structure", () => {
  const files = componentFiles(root);

  it("finds the bar and its subcomponents", () => {
    const names = files.map((file) => basename(file, ".tsx"));
    for (const name of ["GenerateBar", "GenerateReport", "ReportBody", "ViewPanel", "WarningCount", "WarningList", "WarningRow", "AiCopyTrigger", "ConsentSwitch"]) {
      expect(names).toContain(name);
    }
  });

  it("every .tsx declares exactly one component, named like the file, in a folder of the same name", () => {
    for (const file of files) {
      const name = basename(file, ".tsx");
      const where = relative(root, file);
      expect(declaredComponents(readFileSync(file, "utf8")), where).toEqual([name]);
      expect(basename(dirname(file)), where).toBe(name);
    }
  });
});
