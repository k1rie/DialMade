import { describe, expect, it } from "vitest";

import { compileThemeVars } from "./compile";
import { createDesignDoc } from "./doc";
import { toDTCGFull } from "./exporters/dtcg";
import { toDesignMd } from "./exporters/designMd";
import { toThemeCss } from "./exporters/themeCss";
import { applyPatch } from "./patch";
import { DesignDocSchema, type DesignDoc } from "./schema";
import { resolveThemeInputs, resolveTokens } from "./tokens";

const seeds = { primary: "#0f766e", secondary: "#f59e0b" };

function docWith(brief: { recipeId: string; themeId?: string }): DesignDoc {
  return createDesignDoc({ brand: { name: "Brisa", seeds }, brief: { productType: "saas-general", locale: "es", ...brief } });
}

describe("brief.themeId", () => {
  it("una variante del arquetipo cambia la forma: radios, sombra y borde salen del tema", () => {
    const base = docWith({ recipeId: "soft-neubrutal" });
    const themed = docWith({ recipeId: "soft-neubrutal", themeId: "tweakcn-neo-brutalism" });

    expect(resolveThemeInputs(base).recipe.id).toBe("soft-neubrutal");
    expect(resolveThemeInputs(themed).recipe.id).toBe("tweakcn-neo-brutalism");

    const inputs = resolveThemeInputs(themed);
    const tokens = resolveTokens(themed, { ...inputs, mode: "light" });
    expect(tokens.radius.lg).toBe(0);
    expect(tokens.radius.xl).toBe(0);
    expect(resolveTokens(base, { ...resolveThemeInputs(base), mode: "light" }).radius.lg).toBeGreaterThan(0);
  });

  it("compileThemeVars refleja el tema y es determinista", () => {
    const themed = docWith({ recipeId: "playful", themeId: "daisyui-cupcake" });
    const base = docWith({ recipeId: "playful" });
    const a = compileThemeVars(themed, { mode: "light" });
    expect(compileThemeVars(themed, { mode: "light" })).toEqual(a);
    expect(a).not.toEqual(compileThemeVars(base, { mode: "light" }));
    // Los colores son los de la marca: el tema no toca la paleta.
    expect(a["--primary"]).toBe(compileThemeVars(base, { mode: "light" })["--primary"]);
  });

  it("un tema de otro arquetipo (quedó atrás) se ignora y la receta manda", () => {
    const stale = docWith({ recipeId: "editorial", themeId: "daisyui-cupcake" });
    expect(resolveThemeInputs(stale).recipe.id).toBe("editorial");
  });

  it("un themeId que ya no existe valida y cae a la receta", () => {
    const gone = docWith({ recipeId: "playful", themeId: "daisyui-ya-no-existe" });
    expect(DesignDocSchema.safeParse(gone).success).toBe(true);
    expect(resolveThemeInputs(gone).recipe.id).toBe("playful");
  });

  it("los dials siguen escalando sobre la variante", () => {
    const themed = docWith({ recipeId: "playful", themeId: "daisyui-cupcake" });
    const calm = resolveTokens(themed, { ...resolveThemeInputs(themed), mode: "light" });
    const wild = resolveTokens(
      { ...themed, brief: { ...themed.brief, dials: { ...themed.brief.dials, variance: 10 } } },
      { ...resolveThemeInputs(themed), mode: "light" },
    );
    expect(wild.radius.lg).toBeGreaterThanOrEqual(calm.radius.lg);
  });

  it("se edita con JSON Patch: add, replace y remove; un slug inválido se rechaza", () => {
    const base = docWith({ recipeId: "playful" });
    const added = applyPatch(base, [{ op: "add", path: "/brief/themeId", value: "daisyui-cupcake" }]);
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.doc.brief.themeId).toBe("daisyui-cupcake");

    const replaced = applyPatch(added.doc, [{ op: "replace", path: "/brief/themeId", value: "daisyui-pastel" }]);
    expect(replaced.ok && replaced.doc.brief.themeId).toBe("daisyui-pastel");

    const removed = applyPatch(added.doc, [{ op: "remove", path: "/brief/themeId" }]);
    expect(removed.ok).toBe(true);
    if (removed.ok) expect(removed.doc.brief.themeId).toBeUndefined();

    expect(applyPatch(base, [{ op: "add", path: "/brief/themeId", value: "Con Espacios" }]).ok).toBe(false);
  });

  it("los exportadores dan la receta (arquetipo) y el tema por separado", () => {
    const themed = docWith({ recipeId: "playful", themeId: "daisyui-cupcake" });
    const base = docWith({ recipeId: "playful" });

    const css = toThemeCss(themed);
    expect(css).toContain("Recipe: playful · Theme: daisyui-cupcake");
    expect(toThemeCss(base)).toContain("Recipe: playful ·");
    expect(toThemeCss(base)).not.toContain("Theme:");

    const extensions = toDTCGFull(themed).$extensions["dev.dialmade"] as Record<string, unknown> | undefined;
    const found = extensions ?? Object.values(toDTCGFull(themed).$extensions)[0];
    expect((found as Record<string, unknown>).recipeId).toBe("playful");
    expect((found as Record<string, unknown>).themeId).toBe("daisyui-cupcake");

    expect(toDesignMd(themed)).toContain("· Cupcake");
  });
});
