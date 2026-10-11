// What one «Generar con IA» asks for, built from the DesignDoc (spec §3.1, §4.3, §5.2): which screens (≤ 3 per
// session), what each screen request carries, and which kit pieces (navbar, footer) are generated once and cloned.
// Pure: the store, the cost line and the tests share it.
import { aiDraftOf } from "../edit";
import { KIT_TYPES, brandInput, renderableBlocks, screenInput, type RenderBlockInput, type RenderBrandInput, type RenderScreenInput } from "@dialmade/ai-render";
import { sameAiContext, type AiContext, type AiDirection, type AiDirectionChip, type DesignDoc } from "@dialmade/doc";
import { AI_SESSION_SCREENS } from "../../config";
import { MAX_RENDER_BLOCKS } from "../api";

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max) : text);

/** The screens «Generar con IA» designs by default: the first ones (in order) without any AI block yet. */
export function defaultScreenPick(doc: DesignDoc, max: number = AI_SESSION_SCREENS): string[] {
  const order = doc.screenOrder.filter((id) => doc.screens[id]);
  const fresh = order.filter((id) => !Object.values(doc.screens[id]!.aiRender?.blocks ?? {}).some((block) => block.active));
  return (fresh.length > 0 ? fresh : order).slice(0, max);
}

/** The user's pick, cleaned: screens that still exist, in document order, at most `max`. */
export function pickedScreens(doc: DesignDoc, picked: readonly string[] | null, max: number = AI_SESSION_SCREENS): string[] {
  if (!picked) return defaultScreenPick(doc, max);
  const wanted = new Set(picked);
  return doc.screenOrder.filter((id) => wanted.has(id) && doc.screens[id]).slice(0, max);
}

/**
 * Whether «Generar con IA» reuses the document's art direction: same chip (or «Automática»), the same «Estilo» words,
 * the same «Contexto» and no new reference screenshots. Anything else asks for a new one.
 */
export function directionReusable(
  existing: AiDirection | undefined,
  chip: AiDirectionChip,
  style = "",
  references = 0,
  context?: AiContext,
): existing is AiDirection {
  return (
    !!existing &&
    (chip === "auto" || chip === existing.chip) &&
    (existing.style ?? "") === style.trim() &&
    references === 0 &&
    sameAiContext(existing.context, context)
  );
}

/** The brand as the render routes take it (their Zod caps). */
export function requestBrand(doc: DesignDoc): RenderBrandInput {
  const brand = brandInput(doc);
  return {
    ...brand,
    name: clip(brand.name, 80),
    ...(brand.tagline && { tagline: clip(brand.tagline, 160) }),
    productType: clip(brand.productType, 120),
    ...(brand.description && { description: clip(brand.description, 500) }),
    recipe: { ...brand.recipe, id: clip(brand.recipe.id, 48), mood: clip(brand.recipe.mood, 240) },
  };
}

/**
 * Visible copy of an element of the screen's page (the deterministic draft the model starts from). Track B's
 * `aiDraftOf` is the one definition, so a block written here is not «Desactualizado» at once.
 */
export function draftOf(doc: DesignDoc, screenId: string): (blockId: string) => string[] {
  const screen = doc.screens[screenId];
  return screen ? aiDraftOf(screen) : () => [];
}

/** Every renderable block of a screen as the prompt describes it (also the ones a request skips). */
export function screenBlocks(doc: DesignDoc, screenId: string): RenderScreenInput {
  return screenInput(doc, screenId, { draftOf: draftOf(doc, screenId) });
}

/** The screen request: `skip` (kit clones) and `only` (a retry) applied, capped like the route's schema. */
export function requestScreen(full: RenderScreenInput, options: { skip?: ReadonlySet<string>; only?: ReadonlySet<string> } = {}): RenderScreenInput {
  const blocks = full.blocks.filter((block) => !options.skip?.has(block.id) && (!options.only || options.only.has(block.id))).slice(0, MAX_RENDER_BLOCKS);
  return {
    ...full,
    name: clip(full.name, 80),
    route: clip(full.route, 120),
    screens: full.screens.slice(0, 24).map((screen) => ({ id: screen.id, name: clip(screen.name, 80) })),
    blocks,
  };
}

const kitKey = (block: Pick<RenderBlockInput, "type" | "label">) => `${block.type}\u0000${block.label}`;

export type KitClone = { from: { screenId: string; blockId: string }; to: { screenId: string; blockId: string } };

export type KitPlan = {
  /** Per screen: blocks not asked for (clones of a kit piece). */
  skip: Map<string, Set<string>>;
  /** Clones of a kit piece generated in this run: written when their source is. */
  clones: KitClone[];
  /** Clones of a kit piece the document already has (same direction, on a screen outside this run): written at once. */
  existing: KitClone[];
};

/**
 * The shared kit (spec §4.3, deviation in §15.3): navbars and footers with the same type and label are generated
 * ONCE and cloned into the other screens. When the document already has that piece designed with the same
 * direction on a screen outside this run, every occurrence clones it; otherwise the first occurrence (screen order)
 * is asked for and the others clone it.
 */
export function planKit(doc: DesignDoc, screenIds: readonly string[], inputs: ReadonlyMap<string, RenderScreenInput>, directionId: string): KitPlan {
  const plan: KitPlan = { skip: new Map(), clones: [], existing: [] };
  const inRun = new Set(screenIds);
  const existing = new Map<string, { screenId: string; blockId: string }>();
  for (const screenId of doc.screenOrder) {
    const screen = doc.screens[screenId];
    if (!screen || inRun.has(screenId)) continue;
    for (const [blockId, block] of Object.entries(screen.aiRender?.blocks ?? {})) {
      const layoutBlock = screen.layout.blocks[blockId];
      if (!layoutBlock || !KIT_TYPES.has(layoutBlock.type) || !block.active || !block.html || block.provenance.directionId !== directionId) continue;
      const key = kitKey(layoutBlock);
      if (!existing.has(key)) existing.set(key, { screenId, blockId });
    }
  }
  const sources = new Map<string, { screenId: string; blockId: string }>();
  for (const screenId of screenIds) {
    for (const block of inputs.get(screenId)?.blocks ?? []) {
      if (!KIT_TYPES.has(block.type)) continue;
      const key = kitKey(block);
      const to = { screenId, blockId: block.id };
      const old = existing.get(key);
      const source = sources.get(key);
      if (!old && !source) {
        sources.set(key, to);
        continue;
      }
      let skip = plan.skip.get(screenId);
      if (!skip) plan.skip.set(screenId, (skip = new Set()));
      skip.add(block.id);
      if (old) plan.existing.push({ from: old, to });
      else plan.clones.push({ from: source!, to });
    }
  }
  return plan;
}

/** Ids of the renderable blocks of a screen (for counts before calling). */
export const blockCount = (doc: DesignDoc, screenId: string): number => {
  const screen = doc.screens[screenId];
  return screen ? renderableBlocks(screen).length : 0;
};
