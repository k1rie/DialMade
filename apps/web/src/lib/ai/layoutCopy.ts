// Pure helpers of the optional AI in Modo Layout (critique #7): one request per «Generar» for every screen,
// and the per-block states the canvas shows («Escribiendo · Listo · Sin cambios · Error · Reintentar»).
// Client-safe, no SDK. The hook is useLayoutAiCopy (components/LayoutStep/useLayoutAiCopy).
import type { PatchOperation } from "@dialmade/doc";
import { MAX_COPY_SCREENS, MAX_SECTION_IDS } from "./config";
import type { CopyField, ScreenCopyTarget } from "./fields";

/** «Escribiendo» while the request runs, then «Listo», «Sin cambios» or «Error · Reintentar». */
export type CopyBlockState = "writing" | "done" | "unchanged" | "error";

/** Key of a block in the state map: element ids repeat across screens, so the screen is part of it. */
export const blockKey = (screenId: string, elementId: string): string => `${screenId}/${elementId}`;

/** Inverse of `blockKey` (ids never contain `/`). */
export function parseBlockKey(key: string): { screenId: string; elementId: string } | null {
  const at = key.indexOf("/");
  return at > 0 && at < key.length - 1 ? { screenId: key.slice(0, at), elementId: key.slice(at + 1) } : null;
}

/**
 * The targets as /api/ai/copy accepts them: each screen once (a whole request wins), section ids without
 * repeats, at most `MAX_COPY_SCREENS` screens and `MAX_SECTION_IDS` ids in total. Over that cap every screen is
 * sent whole (Generate policy: «si son más, se mandan enteras las pantallas que cambiaron»). A screen with an
 * empty `sectionIds` asks for nothing and is left out.
 */
export function normalizeScreenTargets(targets: readonly ScreenCopyTarget[]): ScreenCopyTarget[] {
  const order: string[] = [];
  const wanted = new Map<string, string[] | null>();
  for (const target of targets) {
    if (!wanted.has(target.id)) {
      if (target.sectionIds && target.sectionIds.length === 0) continue;
      order.push(target.id);
      wanted.set(target.id, target.sectionIds ? [] : null);
    }
    const list = wanted.get(target.id);
    if (list === null || list === undefined) continue;
    if (!target.sectionIds) {
      wanted.set(target.id, null);
      continue;
    }
    for (const id of target.sectionIds) if (!list.includes(id)) list.push(id);
  }
  const screens = order.slice(0, MAX_COPY_SCREENS);
  const total = screens.reduce((sum, id) => sum + (wanted.get(id)?.length ?? 0), 0);
  return screens.map((id) => {
    const list = wanted.get(id);
    return list && total <= MAX_SECTION_IDS ? { id, sectionIds: list } : { id };
  });
}

/** Blocks with at least one field in the request, in field order: what turns «Escribiendo» while it runs. */
export function offeredBlocks(fields: readonly CopyField[]): string[] {
  const out: string[] = [];
  for (const field of fields) {
    if (field.elementId === null || field.screenId === undefined) continue;
    const key = blockKey(field.screenId, field.elementId);
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

/**
 * The state of every offered block after the answer: «Listo» when one of its ops was applied, «Error» when
 * the model's edits for it were all rejected, «Sin cambios» otherwise (the model kept it, or the user edited
 * it while the request ran and the op was dropped as stale). The brand tagline is not a block.
 */
export function copyBlockStates(
  fields: readonly CopyField[],
  applied: readonly PatchOperation[],
  rejectedIds: readonly string[],
): Record<string, CopyBlockState> {
  const byPointer = new Map(fields.map((field) => [field.pointer, field]));
  const byId = new Map(fields.map((field) => [field.id, field]));
  const states: Record<string, CopyBlockState> = {};
  for (const key of offeredBlocks(fields)) states[key] = "unchanged";
  const mark = (field: CopyField | undefined, state: CopyBlockState) => {
    if (!field || field.elementId === null || field.screenId === undefined) return;
    const key = blockKey(field.screenId, field.elementId);
    if (state === "done" || states[key] !== "done") states[key] = state;
  };
  for (const id of rejectedIds) mark(byId.get(id), "error");
  for (const op of applied) mark(byPointer.get(op.path), "done");
  return states;
}

/** Every offered block in one state («Escribiendo» before the call, «Error» when the request fails). */
export function allBlocks(fields: readonly CopyField[], state: CopyBlockState): Record<string, CopyBlockState> {
  return Object.fromEntries(offeredBlocks(fields).map((key) => [key, state]));
}

/** «Reintentar»: the blocks in «Error», grouped by screen, as targets for one more request. */
export function retryTargets(states: Readonly<Record<string, CopyBlockState>>): ScreenCopyTarget[] {
  const byScreen = new Map<string, string[]>();
  for (const [key, state] of Object.entries(states)) {
    if (state !== "error") continue;
    const parsed = parseBlockKey(key);
    if (!parsed) continue;
    const list = byScreen.get(parsed.screenId) ?? [];
    list.push(parsed.elementId);
    byScreen.set(parsed.screenId, list);
  }
  return normalizeScreenTargets([...byScreen].map(([id, sectionIds]) => ({ id, sectionIds })));
}
