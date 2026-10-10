import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isThemeContractVar } from "./contract";

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
  it("hay hojas de estilo que revisar", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files.map((file) => [path.relative(srcDir, file), file]))("%s solo lee variables del contrato o privadas", (_, file) => {
    const css = readFileSync(file, "utf8");
    const used = [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1] as string);
    const declared = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1] as string));
    for (const name of used) {
      const isPrivate = name.startsWith("--_");
      expect(isThemeContractVar(name) || isPrivate, `${name} no es del contrato`).toBe(true);
      if (isPrivate) expect(declaredAnywhere.has(name), `${name} privada sin declarar`).toBe(true);
    }
    for (const name of declared) {
      expect(name.startsWith("--_"), `${name}: el kit no define variables del tema`).toBe(true);
    }
    expect(css).not.toMatch(/--app-/);
    expect(css).not.toMatch(/@apply|@tailwind|@theme/);
  });

  it("todas las clases llevan el prefijo dl-", () => {
    for (const file of files) {
      const css = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/"[^"]*"/g, '""');
      const classes = [...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1] as string);
      for (const name of classes) expect(name.startsWith("dl-"), `.${name} en ${path.relative(srcDir, file)}`).toBe(true);
    }
  });
});

describe("src/styles.css", () => {
  it("importa todas las hojas de los componentes", () => {
    const entry = readFileSync(path.join(srcDir, "styles.css"), "utf8");
    const imported = new Set([...entry.matchAll(/@import\s+"\.\/([^"]+)"/g)].map((m) => path.join(srcDir, m[1] as string)));
    const missing = files.filter((file) => file !== path.join(srcDir, "styles.css") && !imported.has(file));
    expect(missing.map((file) => path.relative(srcDir, file))).toEqual([]);
  });
});
