import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isThemeContractVar } from "@dialmade/ui";

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });
}

const files = cssFiles(srcDir);
const declaredAnywhere = new Set(
  files.flatMap((file) => [...readFileSync(file, "utf8").matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1] as string)),
);

describe("contrato de variables CSS", () => {
  it.each(files.map((file) => [path.relative(srcDir, file), file]))("%s solo lee variables del contrato o privadas", (_, file) => {
    const css = stripComments(readFileSync(file, "utf8"));
    for (const name of [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1] as string)) {
      const isPrivate = name.startsWith("--_");
      expect(isThemeContractVar(name) || isPrivate, `${name} no es del contrato`).toBe(true);
      if (isPrivate) expect(declaredAnywhere.has(name), `${name} privada sin declarar`).toBe(true);
    }
    for (const name of [...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1] as string)) {
      expect(name.startsWith("--_"), `${name}: las secciones no definen variables del tema`).toBe(true);
    }
    // The app's tokens (`var(--app-…)` / `--app-…:`) are off limits; classes like `.dl-el--app-kpi-row` are fine.
    expect(css).not.toMatch(/var\(\s*--app-|(^|[;{\s])--app-[\w-]+\s*:|@apply|@tailwind|@theme/);
  });

  it("todas las clases llevan el prefijo dl-", () => {
    for (const file of files) {
      const css = stripComments(readFileSync(file, "utf8")).replace(/"[^"]*"/g, '""');
      for (const name of [...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1] as string)) {
        expect(name.startsWith("dl-"), `.${name} en ${path.relative(srcDir, file)}`).toBe(true);
      }
    }
  });
});

describe("hojas de entrada", () => {
  const importsOf = (file: string) =>
    [...stripComments(readFileSync(file, "utf8")).matchAll(/@import\s+"(\.\/[^"]+)"/g)].map((m) => path.resolve(path.dirname(file), m[1] as string));

  it("src/styles.css importa (directa o indirectamente) todas las hojas", () => {
    const seen = new Set<string>();
    const visit = (file: string) => {
      for (const target of importsOf(file)) {
        if (seen.has(target)) continue;
        seen.add(target);
        visit(target);
      }
    };
    const entry = path.join(srcDir, "styles.css");
    visit(entry);
    expect(files.filter((file) => file !== entry && !seen.has(file)).map((file) => path.relative(srcDir, file))).toEqual([]);
  });
});
