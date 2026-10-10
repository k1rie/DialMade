// Dev page only: a one-screen document (the «home» template) whose hero is the processed AI block, to check the
// «Bloques de IA» export card without generating anything.
import { createDesignDoc, safeParseDesignDoc, formatIssues, type AiBlock, type DesignDoc } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate } from "@dialmade/layout";
import { buildPageFromLayout, contentContextFromDoc } from "@dialmade/sections";

export function devExportDoc(html: string, gates: AiBlock["gates"]): DesignDoc {
  const base = createDesignDoc({ brand: { name: "Brisa", seeds: { primary: "#0f766e", secondary: "#f59e0b" } }, brief: { productType: "saas-general", locale: "es", recipeId: "soft-ui" } });
  let n = 0;
  const { layout } = instantiateTemplate(getScreenTemplate("home"), { label: (type) => type[0]!.toUpperCase() + type.slice(1), newId: () => `b-${n++}` });
  const page = buildPageFromLayout(layout, "landing", null, contentContextFromDoc(base), { screenId: "s-home", screenTitle: "Inicio", navScreens: [] }).page;
  const hero = Object.entries(layout.blocks).find(([, block]) => block.type === "hero")![0];
  const block: AiBlock = {
    html: html.replace('data-block-id="b-hero"', `data-block-id="${hero}"`),
    active: true,
    basis: "dev",
    gates,
    provenance: { kind: "generate", path: "manual", model: "dev", createdAt: new Date(0).toISOString(), promptVersion: "dev", seed: 0 },
  };
  const parsed = safeParseDesignDoc({
    ...base,
    screens: { "s-home": { id: "s-home", name: "Inicio", kind: "landing", route: "/", layout, page, shell: null, aiRender: { version: 1, blocks: { [hero]: block } } } },
    screenOrder: ["s-home"],
  });
  if (!parsed.success) throw new Error(formatIssues(parsed.issues));
  return parsed.data;
}
