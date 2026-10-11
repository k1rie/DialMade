// The DesignDoc writes of «Diseño con IA» as RFC 6902 patches (applied by `applyPatch`: validated, one undo step
// each). Additive: `screens[id].aiRender` and `aiRender.direction` (packages/doc/src/aiRender.ts); the deterministic
// page underneath never changes. Pure.
import { getThemeRecipe } from "@dialmade/catalog";
import { isLocked, type AiBlock, type AiDirection, type AiGateWarning, type DesignDoc } from "@dialmade/doc";

export type PatchOp = { op: "add" | "replace" | "remove"; path: string; value?: unknown };

/** Stores (or replaces) the AI block of `blockId` on `screenId`. `null` when the screen or the block is gone. */
export function aiBlockOps(doc: DesignDoc, screenId: string, blockId: string, block: AiBlock): PatchOp[] | null {
  const screen = doc.screens[screenId];
  if (!screen || !screen.layout.blocks[blockId] || !screen.page.elements[blockId]) return null;
  if (!screen.aiRender) return [{ op: "add", path: `/screens/${screenId}/aiRender`, value: { version: 1, blocks: { [blockId]: block } } }];
  return [{ op: "add", path: `/screens/${screenId}/aiRender/blocks/${blockId}`, value: block }];
}

/**
 * «Volver al diseño base» (`active: false`: the HTML is kept) and «Usar IA otra vez». `null` when there is no such
 * AI block or nothing changes.
 */
export function aiBlockActiveOps(doc: DesignDoc, screenId: string, blockId: string, active: boolean): PatchOp[] | null {
  const block = doc.screens[screenId]?.aiRender?.blocks[blockId];
  if (!block || block.active === active) return null;
  return [{ op: "replace", path: `/screens/${screenId}/aiRender/blocks/${blockId}/active`, value: active }];
}

/**
 * The one write outside `aiRender`: the variant of the recipe the direction picked (`brief.themeId`, shape only). It
 * is bounded (the model chose among the code's candidates and the variant must belong to the document's recipe),
 * reversible (same undo step as the direction) and polite: a variant the developer set by hand stays, and a lock
 * on the recipe or the variant («tu guía manda») keeps the brief as it is.
 */
export function themeOps(doc: DesignDoc, direction: AiDirection): PatchOp[] {
  const picked = direction.themeId;
  const current = doc.brief.themeId;
  const mine = current !== undefined && current === doc.aiRender?.direction?.themeId;
  if (isLocked(doc, "/brief/themeId") || isLocked(doc, "/brief/recipeId")) return [];
  if (!picked) {
    // «none» replaces the variant the previous direction put there, never one the developer chose.
    return mine ? [{ op: "remove", path: "/brief/themeId" }] : [];
  }
  if (getThemeRecipe(picked)?.archetypeId !== doc.brief.recipeId) return [];
  if (current === picked) return [];
  if (current !== undefined && !mine) return [];
  return [{ op: current === undefined ? "add" : "replace", path: "/brief/themeId", value: picked }];
}

/**
 * Stores the document's art direction (it is reused by every later screen and block action) and, in the same undo
 * step, the variant it picked (`themeOps`).
 */
export function directionOps(doc: DesignDoc, direction: AiDirection): PatchOp[] {
  const store: PatchOp = doc.aiRender
    ? { op: "add", path: "/aiRender/direction", value: direction }
    : { op: "add", path: "/aiRender", value: { version: 1, direction } };
  return [store, ...themeOps(doc, direction)];
}

const RESPONSIVE_CODES = new Set(["overflow", "small-target"]);

/**
 * Gate 5's verdict (the island's measurements at the cell's widths) into the block's gates: `responsive` and its
 * overflow and small-target warnings replace the previous ones. `null` when the block is gone or nothing changes, so
 * a repeated measurement writes nothing. Not an undo step: the caller applies it with the history paused.
 */
export function responsiveGateOps(doc: DesignDoc, screenId: string, blockId: string, verdict: { responsive: "ok" | "warn"; warnings: AiGateWarning[] }): PatchOp[] | null {
  const block = doc.screens[screenId]?.aiRender?.blocks[blockId];
  if (!block) return null;
  const kept = block.gates.warnings.filter((warning) => !RESPONSIVE_CODES.has(warning.code));
  const warnings = [...kept, ...verdict.warnings].slice(0, 16);
  const same = block.gates.responsive === verdict.responsive && JSON.stringify(block.gates.warnings) === JSON.stringify(warnings);
  if (same) return null;
  return [{ op: "replace", path: `/screens/${screenId}/aiRender/blocks/${blockId}/gates`, value: { ...block.gates, responsive: verdict.responsive, warnings } }];
}
