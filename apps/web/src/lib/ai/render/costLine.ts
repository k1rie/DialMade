// The words of the cost line, shown BEFORE «Generar con IA» calls anything (spec §10.1): «≈ $0,013 · 1 uso de 5 (te
// quedan 4) · 3 pantallas · ≈ 30 s», «≈ $0,55–0,75 con tu key (Opus 5.5)» with «Más barato: Sonnet 5.5 (≈ …)», or
// «$0 … con tu cuenta de Claude». Pure: the caller passes its dictionary (`ai[locale].aiAccess`) and the status.
import type { AiStatusResponse } from "../api";
import { formatUsd } from "@/lib/money";
import type { AiDictionary } from "@/i18n/ai";
import type { CostRange, RenderEstimate } from "./estimate";

const MODEL_NAMES: Readonly<Record<string, string>> = {
  "claude-opus-5-5": "Opus 5.5",
  "claude-sonnet-5-5": "Sonnet 5.5",
  "claude-haiku-5-5": "Haiku 5.5",
};

/** «Opus 5.5» for `claude-opus-5-5` (unknown ids as they are). */
export const modelName = (model: string): string => MODEL_NAMES[model] ?? model;

/** Like `formatUsd`, with three decimals up to $0.10 («$0.013», not «$0.01»: the free tier lives there). */
export function formatCost(value: number, locale: string): string {
  if (value < 0.001 || value >= 0.1) return formatUsd(value, locale);
  return new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US", { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);
}

/** «$0.48–0.65», or one amount when both ends round to the same. */
export function formatRange(range: CostRange, locale: string): string {
  const min = formatCost(range.minUsd, locale);
  const max = formatCost(range.maxUsd, locale);
  return min === max ? min : `${min}–${max.replace(/^[^\d<]*/, "")}`;
}

export type RenderCostLines = {
  /** The line itself. */
  line: string;
  /** BYOK on Opus: «Más barato: Sonnet 5.5 (≈ …)». */
  cheaper?: string;
  /** Free tier over 3 screens: «6 pantallas = 2 usos». */
  sessions?: string;
  /** The time was not measured for this model. */
  unmeasured?: string;
};

export function renderCostLines(estimate: RenderEstimate, texts: AiDictionary["aiAccess"], locale: string, status: Pick<AiStatusResponse, "freeUsesTotal" | "freeUsesRemaining"> | null): RenderCostLines {
  const range = formatRange(estimate, locale);
  if (estimate.path === "manual") return { line: texts.cost.manual(estimate.screens) };
  if (estimate.path === "byok") {
    return {
      line: texts.cost.byok(range, modelName(estimate.model)),
      ...(estimate.cheaper && { cheaper: texts.cost.cheaper(modelName(estimate.cheaper.model), formatRange(estimate.cheaper, locale)) }),
      ...(!estimate.measured && { unmeasured: texts.cost.unmeasured }),
    };
  }
  const total = status?.freeUsesTotal ?? 0;
  const left = Math.max(0, (status?.freeUsesRemaining ?? 0) - estimate.uses);
  return {
    line: texts.cost.free(range, estimate.uses, total, left, estimate.screens, estimate.seconds),
    ...(estimate.uses > 1 && { sessions: texts.cost.sessions(estimate.screens, estimate.uses) }),
  };
}
