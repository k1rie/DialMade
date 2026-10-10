// The DesignDoc writes of «Diseño con IA» as RFC 6902 patches (applied by `applyPatch`: validated, one undo step
// each). Additive: `screens[id].aiRender` and `aiRender.direction` (packages/doc/src/aiRender.ts); the deterministic
// page underneath never changes. Pure.
import type { AiBlock, AiDirection, DesignDoc } from "@dialmade/doc";

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
