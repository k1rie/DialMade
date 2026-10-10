// The DesignDoc writes of «Diseño con IA» as RFC 6902 patches (applied by `applyPatch`: validated, one undo step
// each). Additive: `screens[id].aiRender` and `aiRender.direction` (packages/doc/src/aiRender.ts); the deterministic
// page underneath never changes. Pure.
import type { AiBlock, AiDirection, AiGateWarning, DesignDoc } from "@dialmade/doc";

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

/** Stores the document's art direction (it is reused by every later screen and block action). */
export function directionOps(doc: DesignDoc, direction: AiDirection): PatchOp[] {
  if (!doc.aiRender) return [{ op: "add", path: "/aiRender", value: { version: 1, direction } }];
  return [{ op: "add", path: "/aiRender/direction", value: direction }];
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
