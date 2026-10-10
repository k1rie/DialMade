import type { LayoutDoc, LayoutWarning, ScreenId, ScreenKind, SetTemplateId } from "@dialmade/layout";
// Type-only imports: vitest runs this module without the `@/` alias and without React.
import type { LayoutActions } from "../useLayoutStore";

/*
 * Pure state of the floating bar: the counts of its status text and which primary action it offers.
 */

/** What the status text and the report header count. Same shape as `GenerateStatus` of the i18n. */
export type ProjectStats = { screens: number; blocks: number; free: number; warnings: number };

/** Anything with a layout and its warnings: a live screen with its structure, or a generated screen. */
export type CountableScreen = { layout: LayoutDoc; warnings: readonly LayoutWarning[] };

/** Screens, blocks, free blocks («Bloque libre», rendered as placeholders) and warnings. */
export function countStats(screens: readonly CountableScreen[]): ProjectStats {
  let blocks = 0;
  let free = 0;
  let warnings = 0;
  for (const screen of screens) {
    for (const block of Object.values(screen.layout.blocks)) {
      blocks++;
      if (block.type === "free") free++;
    }
    warnings += screen.warnings.length;
  }
  return { screens: screens.length, blocks, free, warnings };
}

/**
 * The primary action of the bar:
 * - no block in any screen → «Usar plantilla <set>» (the set that matches the active screen's kind);
 * - never generated → «Generar diseño»;
 * - generated and N blocks changed → «Regenerar N bloques»;
 * - generated and nothing changed → «Generar de nuevo».
 */
export type CtaState =
  | { kind: "template"; set: SetTemplateId }
  | { kind: "generate" }
  | { kind: "regenerate"; count: number }
  | { kind: "again" };

export type CtaInput = {
  /** Blocks in every screen. */
  blocks: number;
  /** Whether «Generar» ran: in this session, or before (the document's blocks carry their fingerprints). */
  generated: boolean;
  /** `changedCount()`: blocks new, changed or removed since the last «Generar». */
  changed: number;
  /** Kind of the active screen (picks the template set). */
  activeKind: ScreenKind | null;
};

export function ctaState({ blocks, generated, changed, activeKind }: CtaInput): CtaState {
  if (blocks === 0) return { kind: "template", set: templateSetFor(activeKind) };
  if (!generated) return { kind: "generate" };
  return changed > 0 ? { kind: "regenerate", count: changed } : { kind: "again" };
}

/** Which hint goes under the primary action (see `ctaHint`). */
export type CtaHint = "empty" | "ai" | "upToDate" | "noAi";

/**
 * The hint under the primary action: the template's while the screens are empty, the AI's when it writes the copy,
 * «No hay cambios desde el último Generar» only when nothing would change (`pending`: the draft has no layout change
 * the document lacks, also the ones «Regenerar N» does not count: moves, renames, routes, links, hiding), else
 * «Sin IA y sin créditos».
 */
export function ctaHint(cta: CtaState, { aiOn, pending }: { aiOn: boolean; pending: boolean }): CtaHint {
  if (cta.kind === "template") return "empty";
  if (aiOn) return "ai";
  return cta.kind === "again" && !pending ? "upToDate" : "noAi";
}

/** «SaaS app» for an app screen, «Landing» otherwise. */
export const templateSetFor = (kind: ScreenKind | null): SetTemplateId => (kind === "app" ? "saas-app" : "landing");

type TemplateActions = Pick<LayoutActions, "beginBatch" | "applySet" | "removeScreen" | "commitBatch">;

/**
 * «Usar plantilla»: the screens are all empty, so the set replaces them, as one undo step (undo brings
 * the empty screens back). The first screen of the set becomes active. Returns the new screen ids.
 */
export function replaceWithTemplateSet(actions: TemplateActions, previous: readonly ScreenId[], set: SetTemplateId): ScreenId[] {
  actions.beginBatch();
  const created = actions.applySet(set);
  if (created.length > 0) for (const id of previous) actions.removeScreen(id);
  actions.commitBatch();
  return created;
}
