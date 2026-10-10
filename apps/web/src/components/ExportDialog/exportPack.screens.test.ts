import { outputKindOptions, type OutputKind } from "@dialmade/catalog";
import { compileThemeVars, resolveThemeInputs, toDesignMd, toPromptPack, type DesignDoc, type Screen } from "@dialmade/doc";
import { themeVarsCss } from "@dialmade/sections";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { exportDialog } from "@/i18n/export";
import { sampleDoc } from "@/lib/ai/testing";
import { SCREEN_ATTRIBUTE } from "@/lib/screen-layout";
import { buildClaudeDesignPack, buildCodePack, exportOptions, type PackInput } from "./exportPack";
import { LAYOUT_JSON_FORMAT, screenPages } from "./screenPages";
import { screensFixture } from "./testing";

const LOGO = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const KIT = { ui: ".dl-button{color:red}", sections: ".dl-landing{display:block}" };

function input(doc: DesignDoc, overrides: Partial<PackInput> = {}): PackInput {
  return {
    doc,
    inputs: resolveThemeInputs(doc),
    mode: "light",
    locale: "es",
    kindLabel: (kind: OutputKind) => outputKindOptions.find((option) => option.id === kind)!.label.es,
    texts: exportDialog.es.files,
    css: KIT,
    ...overrides,
  };
}

/** Unzipped files by path relative to the pack's root folder. */
function unzip(bytes: Uint8Array, root: string): Record<string, string | Uint8Array> {
  return Object.fromEntries(
    Object.entries(unzipSync(bytes)).map(([path, content]) => {
      expect(path.startsWith(`${root}/`), path).toBe(true);
      const inside = path.slice(root.length + 1);
      return [inside, inside.endsWith(".png") ? content : strFromU8(content)];
    }),
  );
}

const text = (files: Record<string, string | Uint8Array>, path: string) => {
  const value = files[path];
  expect(typeof value, path).toBe("string");
  return value as string;
};

/** POSIX join of a relative href onto the folder of `from` (`null` when it climbs out of the pack). */
function resolvePath(from: string, href: string): string | null {
  const parts = from.split("/").slice(0, -1);
  for (const segment of href.split("/")) {
    if (segment === "..") {
      if (parts.length === 0) return null;
      parts.pop();
    } else if (segment !== ".") parts.push(segment);
  }
  return parts.join("/");
}

/** Local hrefs, srcs and form actions of an HTML file (no fonts, no in-page anchors, no data URLs). */
function localRefs(html: string): string[] {
  return [...html.matchAll(/\s(?:href|src|action)="([^"]*)"/g)]
    .map((match) => match[1]!)
    .filter((ref) => !/^(https?:|data:|#|mailto:)/.test(ref) && ref !== "");
}

const cssIds = (css: string) => [...new Set([...css.matchAll(/\[data-dl-id="([^"]+)"\]/g)].map((match) => match[1]!))];

describe("«Código» with screens", () => {
  const { doc } = screensFixture();
  const built = buildCodePack(input(doc, { logo: { bytes: LOGO, type: "image/png" } }));
  const files = unzip(built.bytes, "brisa-dialmade");

  it("writes one folder per screen (`/` at the root) with index.html, layout.css and layout.json, plus brand/", () => {
    expect(built.filename).toBe("brisa-dialmade.zip");
    const screenFiles = Object.keys(files)
      .filter((path) => /(^|\/)(index\.html|layout\.css|layout\.json)$/.test(path))
      .sort();
    expect(screenFiles).toEqual(
      [
        "index.html",
        "layout.css",
        "layout.json",
        ...["precios", "entrar", "app-dashboard", "app-2"].flatMap((dir) => [`${dir}/index.html`, `${dir}/layout.css`, `${dir}/layout.json`]),
        "brand/index.html",
      ].sort(),
    );
    // Shared files are unchanged; no legacy page folders.
    for (const path of ["README.md", "theme.css", "tokens.tokens.json", "DESIGN.md", "assets/dialmade-ui.css", "assets/logo.png", "prompts/claude.md"]) {
      expect(files, path).toHaveProperty([path]);
    }
    expect(Object.keys(files).some((path) => path.startsWith("landing/") || path.startsWith("app/"))).toBe(false);
    expect(built.skippedSections).toBe(0);
  });

  it("every local href and src resolves to a file of the pack, links included", () => {
    for (const path of Object.keys(files).filter((entry) => entry.endsWith(".html"))) {
      const refs = localRefs(text(files, path));
      expect(refs.length, path).toBeGreaterThan(0);
      for (const ref of refs) {
        const target = resolvePath(path, ref);
        expect(target !== null && Object.hasOwn(files, target), `${path} → ${ref}`).toBe(true);
      }
    }
  });

  it("links between screens are real relative hrefs to each index.html", () => {
    const home = text(files, "index.html");
    expect(home).toContain('href="precios/index.html" data-dl-screen-link="s-pricing"');
    expect(home).toContain('href="entrar/index.html" data-dl-screen-link="s-login"');
    // A linked form submits to its screen.
    expect(text(files, "entrar/index.html")).toContain('action="../app-dashboard/index.html"');
    // The shell's nav items (built from the app screens) link both ways.
    const dashboard = text(files, "app-dashboard/index.html");
    expect(dashboard).toContain('href="../app-2/index.html"');
    expect(text(files, "app-2/index.html")).toContain('href="../app-dashboard/index.html"');
  });

  it("each page loads its layout.css after the kit CSS and has every element the CSS targets", () => {
    for (const page of screenPages(doc)) {
      const folder = page.dir ? `${page.dir}/` : "";
      const base = page.dir ? "../" : "";
      const html = text(files, `${folder}index.html`);
      const css = text(files, `${folder}layout.css`);
      expect(css, page.id).toBe(page.css);
      // One screen per file: the export keeps the unscoped rules (the app's scoped variant is for in-app rendering).
      expect(css, page.id).not.toContain(SCREEN_ATTRIBUTE);
      expect(html, page.id).not.toContain(`${SCREEN_ATTRIBUTE}=`);
      const kit = html.indexOf(`href="${base}assets/dialmade-sections.css"`);
      const layout = html.indexOf('href="layout.css"');
      expect(kit, page.id).toBeGreaterThan(0);
      expect(layout, page.id).toBeGreaterThan(kit);
      const ids = cssIds(css);
      expect(ids.length, page.id).toBeGreaterThan(0);
      for (const id of ids) expect(html, `${page.id}: ${id}`).toContain(`data-dl-id="${id}"`);
    }
  });

  it("layout.json describes the screen and its links resolve next to it", () => {
    for (const page of screenPages(doc)) {
      const folder = page.dir ? `${page.dir}/` : "";
      const value = JSON.parse(text(files, `${folder}layout.json`));
      expect(value.format).toBe(LAYOUT_JSON_FORMAT);
      expect(value.screen).toMatchObject({ id: page.id, name: page.name, route: page.route, kind: page.kind });
      expect(value.layout).toEqual(doc.screens[page.id]!.layout);
      for (const link of value.links) {
        expect(Object.hasOwn(doc.screens, link.to)).toBe(true);
        const target = resolvePath(`${folder}layout.json`, link.href);
        expect(target !== null && Object.hasOwn(files, target), `${page.id} → ${link.href}`).toBe(true);
      }
    }
    expect(JSON.parse(text(files, "layout.json")).links.length).toBeGreaterThan(0);
  });

  it("titles each page «Marca · Pantalla» and themes it with the screen's own dials", () => {
    const inputs = resolveThemeInputs(doc);
    for (const page of screenPages(doc)) {
      const folder = page.dir ? `${page.dir}/` : "";
      const html = text(files, `${folder}index.html`);
      expect(html).toContain(`<title>Brisa · ${page.name}</title>`);
      const pageDials = page.page.dials;
      const vars = compileThemeVars(doc, { ...inputs, mode: "light", ...(pageDials && { pageDials }) });
      expect(html, page.id).toContain(`<style id="dl-theme-vars">${themeVarsCss(vars)}`);
    }
    expect(text(files, "index.html")).not.toBe(text(files, "precios/index.html"));
    const homeVars = text(files, "index.html").match(/<style id="dl-theme-vars">[^<]*/)![0];
    const pricingVars = text(files, "precios/index.html").match(/<style id="dl-theme-vars">[^<]*/)![0];
    expect(pricingVars).not.toBe(homeVars);
    expect(text(files, "brand/index.html")).toContain("<title>Brisa · Guía de estilo</title>");
  });

  it("README: DesignDoc version, layout files and «Pantallas y flujo» with each screen's file and links", () => {
    const readme = text(files, "README.md");
    expect(readme).toContain("# Brisa · Dialmade");
    expect(readme).toContain("(DesignDoc v2)");
    expect(readme).toContain("- `index.html`: Inicio.");
    expect(readme).toContain("- `precios/index.html`: Precios.");
    expect(readme).toContain("- `brand/index.html`: Guía de estilo.");
    expect(readme).toContain("`layout.css`");
    expect(readme).toContain("`layout.json`");
    expect(readme).toContain("## Pantallas y flujo");
    expect(readme).toContain("1. Inicio (`/`): `index.html` → Precios, Entrar");
    expect(readme).toContain("4. Dashboard (`/app/dashboard`): `app-dashboard/index.html` → Ajustes");
    expect(readme).toContain("5. Ajustes (`/app`): `app-2/index.html`\n");
    expect(readme.indexOf("## Pantallas y flujo")).toBeLessThan(readme.indexOf("## Usarlo en tu app"));
    const en = unzip(buildCodePack(input(doc, { locale: "en", texts: exportDialog.en.files })).bytes, "brisa-dialmade");
    expect(text(en, "README.md")).toContain("## Screens and flow");
  });

  it("DESIGN.md and the prompts describe what renders (visibleProps) and list the screens", () => {
    const options = exportOptions(resolveThemeInputs(doc));
    expect(text(files, "DESIGN.md")).toBe(toDesignMd(doc, { ...options, locale: "es" }));
    expect(text(files, "DESIGN.md")).toContain("Pantallas y flujo");
    expect(text(files, "prompts/claude.md")).toBe(toPromptPack(doc, "claude", "es", options));
    // Without visibleProps the outline would list every stored item of the screen pages.
    expect(toDesignMd(doc, { ...resolveThemeInputs(doc), locale: "es" })).not.toBe(text(files, "DESIGN.md"));
  });

  it("is deterministic", () => {
    const again = unzip(buildCodePack(input(doc, { logo: { bytes: LOGO, type: "image/png" } })).bytes, "brisa-dialmade");
    expect(again).toEqual(files);
  });
});

describe("«Claude Design» with screens", () => {
  const { doc } = screensFixture();
  const built = buildClaudeDesignPack(input(doc, { logo: { bytes: LOGO, type: "image/png" } }));
  const files = unzip(built.bytes, "brisa-claude-design");

  it("previews every screen: preview.html is the first, preview-{screen}.html the others, then the style guide", () => {
    expect(built.filename).toBe("brisa-claude-design.zip");
    expect(Object.keys(files).filter((path) => path.endsWith(".html")).sort()).toEqual(
      ["preview.html", "preview-precios.html", "preview-entrar.html", "preview-app-dashboard.html", "preview-app-2.html", "preview-brand.html"].sort(),
    );
    expect(text(files, "preview.html")).toContain("<title>Brisa · Inicio</title>");
    expect(built.skippedSections).toBe(0);
  });

  it("previews are self-contained (kit and layout CSS inline, logo as data URL) and link to each other", () => {
    const pages = screenPages(doc);
    const fileOf = (id: string) => (id === "s-home" ? "preview.html" : `preview-${pages.find((page) => page.id === id)!.slug}.html`);
    for (const page of pages) {
      const html = text(files, fileOf(page.id));
      expect(html).toContain(KIT.ui);
      expect(html).toContain(page.css.slice(0, 200));
      expect(html).not.toContain("layout.css");
      expect(html).not.toContain("assets/");
      for (const id of cssIds(page.css)) expect(html, `${page.id}: ${id}`).toContain(`data-dl-id="${id}"`);
      for (const ref of localRefs(html)) expect(Object.hasOwn(files, ref), `${page.id} → ${ref}`).toBe(true);
    }
    expect(text(files, "preview.html")).toContain("data:image/png;base64,");
    expect(text(files, "preview.html")).toContain('href="preview-precios.html" data-dl-screen-link="s-pricing"');
    expect(text(files, "preview-app-dashboard.html")).toContain('href="preview-app-2.html"');
  });

  it("README lists the previews and the flow", () => {
    const readme = text(files, "README.md");
    expect(readme).toContain("brand book");
    expect(readme).toContain("- `preview.html`: Inicio con el tema aplicado");
    expect(readme).toContain("- `preview-precios.html`: Precios.");
    expect(readme).toContain("- `preview-brand.html`: Guía de estilo.");
    expect(readme).toContain("## Pantallas y flujo");
    expect(readme).toContain("2. Precios (`/precios`): `preview-precios.html` → Entrar");
  });

  it("README's upload step names every preview file of the pack, in es and en", () => {
    const previews = Object.keys(files).filter((path) => path.endsWith(".html"));
    const step = text(files, "README.md").split("\n").find((line) => line.startsWith("2. Sube estos archivos:"))!;
    expect(step).toBe(
      "2. Sube estos archivos: `DESIGN.md`, `theme.css`, `tokens.tokens.json`, `preview.html`, `preview-precios.html`, `preview-entrar.html`, `preview-app-dashboard.html`, `preview-app-2.html`, `preview-brand.html` y `logo.png`.",
    );
    for (const file of previews) expect(step).toContain(`\`${file}\``);
    const en = unzip(buildClaudeDesignPack(input(doc, { locale: "en", texts: exportDialog.en.files })).bytes, "brisa-claude-design");
    const enStep = text(en, "README.md").split("\n").find((line) => line.startsWith("2. Upload these files:"))!;
    for (const file of previews) expect(enStep).toContain(`\`${file}\``);
    expect(enStep.endsWith("`preview-brand.html`.")).toBe(true);
  });

  it("the root screen gets its own preview name when it is not the first one", () => {
    const { doc: reordered } = screensFixture(["s-pricing", "s-home", "s-login"]);
    const names = Object.keys(unzip(buildClaudeDesignPack(input(reordered)).bytes, "brisa-claude-design"))
      .filter((path) => path.endsWith(".html"))
      .sort();
    expect(names).toEqual(["preview-brand.html", "preview-entrar.html", "preview-index.html", "preview.html"]);
    const code = unzip(buildCodePack(input(reordered)).bytes, "brisa-dialmade");
    // In the code pack `/` still goes at the root, and Precios gets its folder.
    expect(text(code, "index.html")).toContain("<title>Brisa · Inicio</title>");
    expect(text(code, "precios/index.html")).toContain("<title>Brisa · Precios</title>");
  });
});

describe("zip paths never come from what the user typed", () => {
  it("weird routes and names stay inside the root folder, in safe paths, escaped in HTML and on one README line", () => {
    const { doc } = screensFixture();
    const model = doc.screens["s-pricing"]!;
    const weird: [string, unknown, string][] = [
      ["s-a", "/../../../etc/passwd", "../../evil"],
      ["s-b", "/..", "<script>alert(1)</script>"],
      ["s-c", "/", "Name with `ticks`\n## Injected heading"],
      ["s-d", "C:\\Windows\\System32", "C:\\Windows"],
      ["s-e", "/assets", "assets"],
      ["s-f", "/%2e%2e/%2f", "%2e%2e"],
      ["s-g", undefined, "no route"],
    ];
    const screens = Object.fromEntries(weird.map(([id, route, name]) => [id, { ...model, id, route, name } as unknown as Screen]));
    const loose: DesignDoc = { ...doc, screens, screenOrder: weird.map(([id]) => id) };
    for (const pack of [buildCodePack, buildClaudeDesignPack]) {
      const built = pack(input(loose));
      const root = built.filename.replace(/\.zip$/, "");
      for (const path of Object.keys(unzipSync(built.bytes))) {
        expect(path.startsWith(`${root}/`), path).toBe(true);
        expect(path.split("/")).not.toContain("..");
        expect(path, path).toMatch(/^[a-z0-9-]+\/[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/i);
      }
    }
    const files = unzip(buildCodePack(input(loose)).bytes, "brisa-dialmade");
    expect(Object.keys(files).filter((path) => path.endsWith("/index.html") || path === "index.html").sort()).toEqual(
      ["index.html", "etc-passwd/index.html", "screen-2/index.html", "c-windows-system32/index.html", "assets-2/index.html", "2e-2e-2f/index.html", "screen-7/index.html", "brand/index.html"].sort(),
    );
    expect(text(files, "screen-2/index.html")).toContain("<title>Brisa · &lt;script&gt;alert(1)&lt;/script&gt;</title>");
    const readme = text(files, "README.md");
    expect(readme).toContain("3. Name with ticks ## Injected heading (`/`): `index.html`");
    expect(readme).not.toMatch(/^## Injected/m);
  });
});

describe("documents without screens", () => {
  it("keep the legacy tree: no layout files, no flow section, kind folders and the focus at the root", () => {
    const doc = sampleDoc(["landing", "brand"]);
    const files = unzip(buildCodePack(input(doc)).bytes, "brisa-dialmade");
    expect(Object.keys(files).some((path) => path.includes("layout."))).toBe(false);
    expect(Object.keys(files).filter((path) => path.endsWith(".html")).sort()).toEqual(["brand/index.html", "index.html", "landing/index.html"]);
    const readme = text(files, "README.md");
    expect(readme).not.toContain("Pantallas y flujo");
    expect(readme).toContain("(DesignDoc v2)");
    expect(readme).toContain("- `landing/index.html`: Landing page.");
    // The root copy only changes its relative paths.
    expect(text(files, "index.html").replaceAll('"assets/', '"../assets/')).toBe(text(files, "landing/index.html"));
    const claude = unzip(buildClaudeDesignPack(input(doc)).bytes, "brisa-claude-design");
    expect(text(claude, "README.md")).toContain("- `preview-brand.html`: Guía de estilo.");
    expect(text(claude, "README.md")).not.toContain("Pantallas y flujo");
  });
});
