import type { DesignDoc } from "@dialmade/doc";
import type { SetTemplateId } from "@dialmade/layout";

/** What the brief focuses on (`doc.brief.focus`): the Palette Lab preview tab the user was on. */
export type BriefFocus = DesignDoc["brief"]["focus"];

/**
 * Starting set to mark as «Recomendada»: the one that matches the focus of the brief (modo-layout spec:
 * «la recomendada viene marcada según la pestaña del Palette Lab»). A brand-only focus recommends none.
 */
export function recommendedSet(focus: BriefFocus | undefined): SetTemplateId | null {
  if (focus === "app") return "saas-app";
  if (focus === "landing") return "landing";
  return null;
}
