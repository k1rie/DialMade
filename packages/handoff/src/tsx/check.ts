// Test helpers of the TSX export: type-check the files with the TypeScript compiler and check that Tailwind v4
// generates CSS for every class they use. Node only (tests).
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import type { TsxFiles } from "./toTsx";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(pkgRoot, "package.json"));

/** tsc diagnostics of the exported files (empty when they compile), with React 19 types and `strict`. */
export function typeCheck(files: TsxFiles): string[] {
  // Inside the package's node_modules so `react` resolves to its types.
  const cache = path.join(pkgRoot, "node_modules", ".cache");
  mkdirSync(cache, { recursive: true });
  const dir = mkdtempSync(path.join(cache, "tsx-"));
  try {
    const names: string[] = [];
    for (const [file, content] of Object.entries(files)) {
      if (!/\.tsx?$/.test(file)) continue;
      const target = path.join(dir, file);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content);
      names.push(target);
    }
    const program = ts.createProgram(names, {
      strict: true,
      noEmit: true,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ["lib.es2023.d.ts", "lib.dom.d.ts"],
      types: ["react"],
      skipLibCheck: true,
      noUnusedLocals: true,
      noUncheckedIndexedAccess: true,
      isolatedModules: true,
      verbatimModuleSyntax: true,
    });
    return ts.getPreEmitDiagnostics(program).map((d) => {
      const where = d.file ? `${path.relative(dir, d.file.fileName)}:${d.file.getLineAndCharacterOfPosition(d.start ?? 0).line + 1}` : "";
      return `${where} ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Every class of the exported TSX (static `className` strings). */
export function classesOf(files: TsxFiles): string[] {
  const out = new Set<string>();
  for (const [file, content] of Object.entries(files)) {
    if (!file.endsWith(".tsx")) continue;
    for (const match of content.matchAll(/className=(?:"([^"]*)"|\{\[("[^"]*"))/g)) {
      const value = match[1] ?? (JSON.parse(match[2]!) as string);
      for (const name of value.split(/\s+/)) if (name) out.add(name);
    }
  }
  return [...out].sort();
}

/** Classes Tailwind v4 generates nothing for, compiling the export's own `dialmade.css`. */
export async function unknownClasses(files: TsxFiles): Promise<string[]> {
  const { compile } = (await import("tailwindcss")) as typeof import("tailwindcss");
  const twDir = path.dirname(require.resolve("tailwindcss/package.json"));
  const compiler = await compile(files["src/dialmade.css"]!, {
    base: pkgRoot,
    loadStylesheet: async (id: string, base: string) => {
      const file = id === "tailwindcss" ? path.join(twDir, "index.css") : id.startsWith("tailwindcss/") ? path.join(twDir, `${id.slice(12)}.css`) : path.resolve(base, id);
      return { content: readFileSync(file, "utf8"), base: path.dirname(file), path: file };
    },
  });
  const unknown: string[] = [];
  let previous = compiler.build([]);
  // `dark` and `light` are selectors of dialmade.css (a subtree's color mode), not utilities.
  for (const name of classesOf(files).filter((value) => value !== "dark" && value !== "light")) {
    const next = compiler.build([name]);
    if (next === previous) unknown.push(name);
    previous = next;
  }
  return unknown;
}
