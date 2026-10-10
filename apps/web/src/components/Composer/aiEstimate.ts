import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { DEFAULT_AI_MODEL } from "@/lib/ai/config";
import { priceFor } from "@/lib/ai/pricing";
import { AI_ESTIMATE } from "./constants";

function textLength(value: unknown): number {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + textLength(item), 0);
  if (value && typeof value === "object") return Object.values(value).reduce<number>((sum, item) => sum + textLength(item), 0);
  return 0;
}

/** Rough USD cost of rewriting the copy of `kind` (or only `sectionIds`) with `model`, before calling the AI. */
export function estimateCopyCost(doc: DesignDoc, kind: OutputKind, sectionIds?: readonly string[], model: string = DEFAULT_AI_MODEL): number {
  const page = doc.pages[kind];
  if (!page) return 0;
  const hidden = new Set(page.hidden ?? []);
  const ids = sectionIds ?? Object.keys(page.elements).filter((id) => id !== page.root && !hidden.has(id));
  const chars = ids.reduce((sum, id) => sum + textLength(page.elements[id]?.props), 0);
  const copyTokens = chars / AI_ESTIMATE.charsPerToken;
  const input = AI_ESTIMATE.promptOverheadTokens + copyTokens;
  const output = copyTokens * AI_ESTIMATE.outputRatio;
  const price = priceFor(model, input);
  return (input * price.input + output * price.output) / 1_000_000;
}

export { formatUsd } from "@/lib/money";
