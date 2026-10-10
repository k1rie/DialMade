// Test fixtures of «Diseño con IA» in «Ajustar»: a fictional brand («Lumen») with a landing whose hero and features
// are AI blocks, built exactly like the app does (Layout draft → «Generar» → AI blocks written as patches). Only
// imported by tests.
import { applyPatch, createDesignDoc, type AiBlock, type AiDirection, type DesignDoc } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate, type LayoutBlock, type ScreenTemplateId } from "@dialmade/layout";
import { withGeneratedScreens, type GeneratedScreenInput } from "@/lib/design-engine";
import { aiBlockInputs, currentBasis, setAiBlockOps } from "./edit";

export const freshDoc = (): DesignDoc =>
  createDesignDoc({
    brand: { name: "Lumen", seeds: { primary: "#7c5cff" } },
    brief: { productType: "saas-general", locale: "es", recipeId: "soft-ui" },
    provenance: { createdAt: "2026-10-10T09:00:00.000Z" },
  });

export function idFactory(prefix = "b") {
  let n = 0;
  return () => `${prefix}-${(++n).toString(36).padStart(6, "0")}`;
}

export function draftScreen(newId: () => string, id: string, name: string, route: string, templateId: ScreenTemplateId): GeneratedScreenInput {
  const template = getScreenTemplate(templateId);
  const { layout, shell } = instantiateTemplate(template, { label: (type) => type, newId });
  const kind = template.kind ?? "landing";
  return { screenId: id, name, kind, route, shell: kind === "app" ? (shell ?? { nav: "sidebar", header: true }) : null, layout };
}

export function unwrap(result: ReturnType<typeof applyPatch>): DesignDoc {
  if (!result.ok) throw new Error(`${result.error.reason}: ${result.error.message}`);
  return result.doc;
}

export const blockOfType = (screen: GeneratedScreenInput, type: LayoutBlock["type"]) =>
  Object.keys(screen.layout.blocks).find((id) => screen.layout.blocks[id]!.type === type)!;

/** Sanitized-looking AI HTML with styled text, a label/input pair (prefixed ids) and an icon. */
export const aiHtml = (id: string) =>
  `<section class="@container py-section" data-block-id="${id}"><h1 class="text-h1" data-dl-t="0">Reserva <span class="text-primary-text" data-dl-t="1">en dos toques</span></h1><label for="ai-${id}-email" data-dl-t="2">Email</label><input id="ai-${id}-email" type="email" aria-describedby="ai-${id}-hint"><p id="ai-${id}-hint" data-dl-t="3"><i data-icon="check" aria-hidden="true"></i>Sin tarjeta</p></section>`;

export const testDirection: AiDirection = {
  id: "dir-1",
  version: 1,
  seed: 7,
  chip: "auto",
  axes: { composition: "editorial", typeVoice: "humanist", decoration: "tinted-panels", imagery: "framed-screens", colorStrategy: "tonal-monochrome", rhythm: "airy" },
  moves: ["Cards with a border and no shadow"],
  rationale: "Calm, editorial.",
  provenance: { kind: "direction", path: "free", model: "claude-haiku-5-5", createdAt: "2026-10-10T12:00:00.000Z", promptVersion: "ai-render/1", seed: 7 },
};

export const testAiBlock = (doc: DesignDoc, screenId: string, id: string, extra: Partial<AiBlock["provenance"]> = {}): AiBlock => ({
  html: aiHtml(id),
  active: true,
  basis: currentBasis(doc, aiBlockInputs(doc, screenId).get(id)!),
  gates: { contrast: "ok", responsive: "ok", dropped: 0, warnings: [] },
  provenance: {
    kind: "generate",
    path: "free",
    model: "claude-haiku-5-5",
    createdAt: "2026-10-10T12:00:00.000Z",
    promptVersion: "ai-render/1",
    seed: 7,
    recipeId: "soft-ui",
    ...(doc.aiRender?.direction && { directionId: doc.aiRender.direction.id }),
    ...extra,
  },
});

/** A landing (Inicio) whose hero and features blocks are AI blocks; `direction` adds the document's art direction. */
export function designedDoc(options: { direction?: boolean } = {}) {
  const draft = [draftScreen(idFactory(), "s-home", "Inicio", "/", "home")];
  let doc = unwrap(withGeneratedScreens(freshDoc(), draft));
  if (options.direction) doc = unwrap(applyPatch(doc, [{ op: "add", path: "/aiRender", value: { version: 1, direction: testDirection } }]));
  const hero = blockOfType(draft[0]!, "hero");
  const features = blockOfType(draft[0]!, "features");
  doc = unwrap(applyPatch(doc, setAiBlockOps(doc, "s-home", hero, testAiBlock(doc, "s-home", hero))));
  doc = unwrap(applyPatch(doc, setAiBlockOps(doc, "s-home", features, testAiBlock(doc, "s-home", features))));
  return { doc, draft, hero, features };
}
