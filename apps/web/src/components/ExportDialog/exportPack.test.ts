import { outputKindOptions, type OutputKind } from "@dialmade/catalog";
import { resolveThemeInputs } from "@dialmade/doc";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { exportDialog } from "@/i18n/export";
import { sampleDoc } from "@/lib/ai/testing";
import { buildClaudeDesignPack, buildCodePack, packKinds, type PackInput } from "./exportPack";
import { slugify } from "./files";

const doc = sampleDoc(["landing", "brand"]);
const LOGO = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function input(overrides: Partial<PackInput> = {}): PackInput {
  return {
    doc,
    inputs: resolveThemeInputs(doc),
    mode: "light",
    locale: "es",
    kindLabel: (kind: OutputKind) => outputKindOptions.find((option) => option.id === kind)!.label.es,
    texts: exportDialog.es.files,
    css: { ui: ".dl-button{color:red}", sections: ".dl-landing{display:block}" },
    ...overrides,
  };
}

const unzip = (bytes: Uint8Array) =>
  Object.fromEntries(Object.entries(unzipSync(bytes)).map(([path, content]) => [path, path.endsWith(".png") ? content : strFromU8(content)]));

describe("export packs", () => {
  it("the imported families (tokens.typography) are the ones the HTML links and the README names", () => {
    const own = { ...doc, tokens: { ...doc.tokens, typography: { ...doc.tokens.typography, body: { family: "Lora", source: "google" as const } } } };
    const files = unzip(buildCodePack(input({ doc: own, inputs: resolveThemeInputs(own) })).bytes);
    const root = "brisa-dialmade/";
    expect(files[`${root}index.html`]).toMatch(/fonts\.googleapis\.com\/css2\?[^"]*family=Lora/);
    expect(files[`${root}README.md`]).toContain("Lora para texto");
  });

  it("puts the focus page first", () => {
    expect(packKinds(doc)).toEqual(["landing", "brand"]);
  });

  it("«Código»: HTML per page linking the kit CSS, theme, tokens, DESIGN.md, prompts and README", () => {
    const built = buildCodePack(input({ logo: { bytes: LOGO, type: "image/png" } }));
    expect(built.filename).toBe("brisa-dialmade.zip");
    const files = unzip(built.bytes);
    const root = "brisa-dialmade/";
    for (const path of [
      "README.md",
      "index.html",
      "landing/index.html",
      "brand/index.html",
      "assets/dialmade-ui.css",
      "assets/dialmade-sections.css",
      "assets/logo.png",
      "theme.css",
      "tokens.tokens.json",
      "figma-light.tokens.json",
      "figma-dark.tokens.json",
      "figma-numbers.tokens.json",
      "DESIGN.md",
      "prompts/claude.md",
      "prompts/claude-design.md",
      "prompts/cursor.md",
      "prompts/v0.md",
      "prompts/figma.md",
      "prompts/framer.md",
    ]) {
      expect(files, path).toHaveProperty([`${root}${path}`]);
    }
    const index = files[`${root}index.html`] as string;
    const landing = files[`${root}landing/index.html`] as string;
    expect(index).toContain('href="assets/dialmade-ui.css"');
    expect(landing).toContain('href="../assets/dialmade-sections.css"');
    expect(landing).toContain('src="../assets/logo.png"');
    expect(landing).toContain('data-dl-kind="landing"');
    expect(files[`${root}brand/index.html`]).toContain('data-dl-kind="brand"');
    expect(files[`${root}theme.css`]).toMatch(/:root \{[\s\S]*--primary:[\s\S]*\.dark \{/);
    expect(JSON.parse(files[`${root}figma-light.tokens.json`] as string).color.primary.$type).toBe("color");
    expect(files[`${root}README.md`]).toContain("# Brisa · Dialmade");
    expect(files[`${root}assets/logo.png`]).toEqual(LOGO);
    expect(built.skippedSections).toBe(0);
  });

  it("«Claude Design»: brand book, tokens and self-contained previews", () => {
    const built = buildClaudeDesignPack(input({ logo: { bytes: LOGO, type: "image/png" } }));
    expect(built.filename).toBe("brisa-claude-design.zip");
    const files = unzip(built.bytes);
    const root = "brisa-claude-design/";
    for (const path of ["README.md", "DESIGN.md", "theme.css", "tokens.tokens.json", "preview.html", "preview-brand.html", "logo.png", "prompt.md"]) {
      expect(files, path).toHaveProperty([`${root}${path}`]);
    }
    const preview = files[`${root}preview.html`] as string;
    expect(preview).toContain(".dl-button{color:red}");
    expect(preview).toContain("data:image/png;base64,");
    expect(preview).not.toContain("assets/dialmade-ui.css");
    expect(files[`${root}README.md`]).toContain("brand book");
    // The upload step names every preview, not only the first one.
    expect(files[`${root}README.md`]).toContain(
      "2. Sube estos archivos: `DESIGN.md`, `theme.css`, `tokens.tokens.json`, `preview.html`, `preview-brand.html` y `logo.png`.",
    );
    expect(files[`${root}prompt.md`]).toContain("Claude Design");
  });

  it("works without a logo", () => {
    const files = unzip(buildCodePack(input()).bytes);
    expect(Object.keys(files).some((path) => path.endsWith("logo.png"))).toBe(false);
  });

  it("slugifies brand names for file names", () => {
    expect(slugify("Café Brisa & Co.")).toBe("cafe-brisa-co");
    expect(slugify("***")).toBe("dialmade");
  });
});
