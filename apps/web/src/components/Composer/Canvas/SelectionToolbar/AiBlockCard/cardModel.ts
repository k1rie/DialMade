// What the «Bloque de IA» card shows, as plain data (tested without a DOM): the gate warnings in words, the
// provenance line, the session's cost line and the quick chips.
import { getStyleRecipe, type Locale } from "@dialmade/catalog";
import type { AiBlock, AiGateWarning } from "@dialmade/doc";
import type { ComposerDictionary } from "@/i18n/composer";
import { actionsLeft, type LiveSession } from "@/lib/ai/render/liveSession";
import { formatUsd } from "@/lib/money";

type Texts = ComposerDictionary["aiBlock"];

export const QUICK_CHIPS = ["airy", "compact", "left", "brand", "sober"] as const;
export type QuickChip = (typeof QUICK_CHIPS)[number];

/** «claude-haiku-5-5» → «Haiku 5.5»; anything else as it is. */
export function modelName(model: string | undefined): string | null {
  if (!model) return null;
  const match = /^claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(model);
  if (!match) return model === "claude.ai" ? "Claude" : model;
  const family = match[1]!;
  return `${family[0]!.toUpperCase()}${family.slice(1)} ${match[2]}${match[3] ? `.${match[3]}` : ""}`;
}

/** The gate warnings in the user's words (spec §7), at most `max`. */
export function warningLines(warnings: readonly AiGateWarning[], texts: Texts, max = 6): string[] {
  return warnings.slice(0, max).map((warning) => texts.warnings[warning.code](warning.detail ?? ""));
}

/** «Otra versión · Haiku 5.5 · IA gratis · 10 oct 2026, 12:00 · $0.001». */
export function provenanceLine(block: AiBlock, texts: Texts, locale: Locale): string {
  const { provenance } = block;
  const date = new Date(provenance.createdAt);
  const when = Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
  return [texts.provenance.kinds[provenance.kind], modelName(provenance.model), texts.provenance.paths[provenance.path], when, provenance.costUsd !== undefined ? formatUsd(provenance.costUsd, locale) : null]
    .filter((part): part is string => !!part)
    .join(" · ");
}

export type SessionLine = { state: "none" } | { state: "exhausted" } | { state: "ok"; left: number; max: number };

/** The session the next action spends (free tier). */
export function sessionLine(session: LiveSession | null): SessionLine {
  if (!session) return { state: "none" };
  const left = actionsLeft(session.counters);
  return left > 0 ? { state: "ok", left, max: session.counters.actionsMax } : { state: "exhausted" };
}

/** The recipe's name in the UI language (falls back to its id). */
export const recipeLabel = (recipeId: string, locale: Locale): string => getStyleRecipe(recipeId)?.label[locale] ?? recipeId;
