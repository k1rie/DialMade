// Cost estimates shown before an AI copy request (the Composer's menu and toolbar, «Generar» in the Layout step).
// Loads @dialmade/doc and @dialmade/sections: import it only from the lazy design half.
import type { OutputKind } from "@dialmade/catalog";
import { orderedScreens, type DesignDoc } from "@dialmade/doc";
import { isStructuralElement, sectionRegistry, visibleProps } from "@dialmade/sections";
import { DEFAULT_AI_MODEL } from "./config";
import { requestedSections, visibleElementIds, type ScreenCopyTarget } from "./fields";
import { priceFor } from "./pricing";

/**
 * Rough size of an AI copy request, shown before generating (prices come from `./pricing` for the request's
 * model): ~3.5 characters per token, the prompt's fixed part and a rewrite slightly longer.
 */
export const AI_ESTIMATE = {
  charsPerToken: 3.5,
  promptOverheadTokens: 2500,
  outputRatio: 1.3,
} as const;

function textLength(value: unknown): number {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + textLength(item), 0);
  if (value && typeof value === "object") return Object.values(value).reduce<number>((sum, item) => sum + textLength(item), 0);
  return 0;
}

/** USD of one request whose copy (and notes) add up to `chars`, with the prompt overhead once. */
function costForChars(chars: number, model: string): number {
  const copyTokens = chars / AI_ESTIMATE.charsPerToken;
  const input = AI_ESTIMATE.promptOverheadTokens + copyTokens;
  const output = copyTokens * AI_ESTIMATE.outputRatio;
  const price = priceFor(model, input);
  return (input * price.input + output * price.output) / 1_000_000;
}

/** Rough USD cost of rewriting the copy of `kind` (or only `sectionIds`) with `model`, before calling the AI. */
export function estimateCopyCost(doc: DesignDoc, kind: OutputKind, sectionIds?: readonly string[], model: string = DEFAULT_AI_MODEL): number {
  const page = doc.pages[kind];
  if (!page) return 0;
  const hidden = new Set(page.hidden ?? []);
  const ids = sectionIds ?? Object.keys(page.elements).filter((id) => id !== page.root && !hidden.has(id));
  const chars = ids.reduce((sum, id) => sum + textLength(page.elements[id]?.props), 0);
  return costForChars(chars, model);
}

/**
 * Rough USD cost of ONE «Generar» request over several screens (Modo Layout): the props each requested,
 * visible section shows (`visibleProps`, no structural regions) plus the label and note of its block (they
 * travel in <layout_notes>), with the prompt overhead counted once. 0 when nothing would be sent.
 */
export function estimateScreensCopyCost(doc: DesignDoc, screens: readonly ScreenCopyTarget[], model: string = DEFAULT_AI_MODEL): number {
  const requested = requestedSections(screens);
  let chars = 0;
  for (const screen of orderedScreens(doc)) {
    if (!requested.has(screen.id)) continue;
    const wanted = requested.get(screen.id)!;
    for (const id of visibleElementIds(screen.page)) {
      if (wanted && !wanted.has(id)) continue;
      const element = screen.page.elements[id]!;
      if (isStructuralElement(sectionRegistry.get(element.type), element)) continue;
      chars += textLength(visibleProps(element));
      const block = Object.hasOwn(screen.layout.blocks, id) ? screen.layout.blocks[id] : undefined;
      if (block) chars += block.label.length + (block.note?.length ?? 0);
    }
  }
  return chars > 0 ? costForChars(chars, model) : 0;
}
