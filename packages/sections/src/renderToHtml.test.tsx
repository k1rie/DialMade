// @vitest-environment node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { compileThemeVars, resolveThemeInputs, type DesignDoc } from "@dialmade/doc";
import { buildDefaultPage } from "./buildPage";
import { contentContextFromDoc } from "./context";
import { readBundledCss } from "./node";
import { renderStaticPage } from "./renderToHtml";
import { acmeDoc, testRegistry } from "./testing/fixtures";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function landingDoc(): DesignDoc {
  const doc = acmeDoc();
  return { ...doc, pages: { landing: buildDefaultPage("landing", contentContextFromDoc(doc), "minimal", { registry: testRegistry }) } };
}

const varsFor = (doc: DesignDoc, mode: "light" | "dark" = "light") => compileThemeVars(doc, { ...resolveThemeInputs(doc), mode });

describe("renderStaticPage", () => {
  const doc = landingDoc();
  const vars = varsFor(doc);

  it("devuelve un documento HTML completo con variables, fuentes y CSS", () => {
    const html = renderStaticPage(doc, "landing", vars, {
      registry: testRegistry,
      css: ".dl-button{color:red}",
      stylesheets: ["https://cdn.example.test/dialmade-ui.css"],
    });
    expect(html.startsWith("<!doctype html>\n<html lang=\"en\" data-dl-mode=\"light\" data-dl-kind=\"landing\">")).toBe(true);
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
    expect(html).toContain("<title>Acme Cloud</title>");
    expect(html).toContain('<meta name="description" content="Ship faster, sleep better">');
    expect(html).toContain(`<link rel="stylesheet" href="${resolveThemeInputs(doc).pairing.googleFontsUrl.replace(/&/g, "&amp;")}">`);
    expect(html).toContain('<link rel="stylesheet" href="https://cdn.example.test/dialmade-ui.css">');
    expect(html).toContain("<style>.dl-button{color:red}</style>");
    const themeBlock = html.match(/<style id="dl-theme-vars">:root\{([^}]*)\}/)?.[1] ?? "";
    for (const [name, value] of Object.entries(vars)) expect(themeBlock).toContain(`${name}:${value};`);
    expect(html).toContain('<div class="dl-theme" data-dl-mode="light" style="color-scheme:light">');
    expect(html).toContain('data-dl-id="hero-1"');
    expect(html).toMatch(/<h1>[^<]+<\/h1>/);
    expect(html.indexOf("</head>")).toBeLessThan(html.indexOf("<body>"));
  });

  it("deja fuera las secciones que fallan (sin error boundaries en servidor) y las reporta", () => {
    const onSectionError = vi.fn();
    const page = structuredClone(doc.pages.landing!);
    page.elements["features-1"]!.props = { explode: true };
    const html = renderStaticPage(doc, "landing", vars, { registry: testRegistry, onSectionError, page });
    expect(onSectionError).toHaveBeenCalledWith("features-1", expect.any(Error));
    expect(html).not.toContain('data-dl-id="features-1"');
    expect(html).toContain('data-dl-id="navbar-1"');
  });

  it("respeta modo, idioma, título y la opción sin fuentes", () => {
    const html = renderStaticPage(doc, "landing", varsFor(doc, "dark"), {
      registry: testRegistry,
      mode: "dark",
      locale: "es",
      title: 'Acme <"beta">',
      fonts: false,
    });
    expect(html).toContain('<html lang="es" data-dl-mode="dark"');
    expect(html).toContain("<title>Acme &lt;&quot;beta&quot;&gt;</title>");
    expect(html).not.toContain("fonts.googleapis.com");
    expect(html).toContain("color-scheme:dark");
  });

  it("escapa </style> en el CSS y descarta variables inseguras", () => {
    const html = renderStaticPage(doc, "landing", { ...vars, "--evil": "red}</style><script>alert(1)</script>" }, {
      registry: testRegistry,
      css: "a{content:'</style><script>x</script>'}",
    });
    expect(html).not.toContain("</style><script>");
    expect(html.match(/<\/style>/g)?.length).toBe(html.match(/<style[ >]/g)?.length);
    expect(html).not.toContain("--evil");
  });

  it("sin página en el doc construye la de por defecto", () => {
    const html = renderStaticPage(acmeDoc(), "app", vars, { registry: testRegistry });
    expect(html).toContain('data-dl-type="app.shell"');
    expect(html).toContain('aria-label="kpis"');
  });
});

describe("readBundledCss", () => {
  const uiCss = path.resolve(root, "../ui/dist/dialmade-ui.css");

  beforeAll(() => {
    execFileSync(process.execPath, [path.join(root, "scripts/build-css.mjs")], { cwd: root, stdio: "pipe" });
  });

  it.skipIf(!existsSync(uiCss))("concatena dialmade-ui.css y dialmade-sections.css para el HTML exportado", async () => {
    const css = await readBundledCss();
    expect(css).toContain(".dl-button");
    expect(css).toContain(".dl-theme");
    expect(css.indexOf("@dialmade/ui")).toBeLessThan(css.indexOf("@dialmade/sections"));
    const html = renderStaticPage(landingDoc(), "landing", varsFor(landingDoc()), { registry: testRegistry, css });
    expect(html).toContain(".dl-page");
  });
});
