import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import type { SetTemplateId } from "@dialmade/layout";

/** What the brief focuses on (`doc.brief.focus`): the Palette Lab preview tab the user was on. */
export type BriefFocus = DesignDoc["brief"]["focus"];

/** The kind each starting set builds: its live mini on the card and its «Para ti si…». */
export const SET_KINDS: Readonly<Record<SetTemplateId, Exclude<OutputKind, "brand">>> = { "saas-app": "app", landing: "landing" };

/**
 * Starting set to mark as «Recomendada»: the one that matches the focus of the brief, the Palette Lab tab or
 * the «¿No sabes cuál?» answer (modo-layout spec: «la recomendada viene marcada según la pestaña del Palette
 * Lab»). A brand-only focus recommends none: the style guide is generated whatever the set.
 */
export function recommendedSet(focus: BriefFocus | undefined): SetTemplateId | null {
  if (focus === "app") return "saas-app";
  if (focus === "landing") return "landing";
  return null;
}
