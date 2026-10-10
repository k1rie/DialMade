// Which AI blocks of a screen the top bar offers to redo, and how many the session can pay for.
import type { DesignDoc } from "@dialmade/doc";
import { staleAiBlocks, styleChangedAiBlocks } from "@/lib/ai/render/edit";

export type RedoPlan = {
  /** Active AI blocks designed with another recipe. */
  styleChanged: string[];
  /** Active AI blocks whose basis changed (and whose style did not). */
  stale: string[];
  /** Both, in the screen's reading order: what «Rehacer» redoes (1 action each). */
  all: string[];
};

export function redoPlan(doc: DesignDoc, screenId: string, order: readonly string[]): RedoPlan {
  const blocks = doc.screens[screenId]?.aiRender?.blocks ?? {};
  const active = (id: string) => blocks[id]?.active === true;
  const style = styleChangedAiBlocks(doc, screenId);
  const stale = staleAiBlocks(doc, screenId);
  const rank = (id: string) => {
    const at = order.indexOf(id);
    return at < 0 ? Number.MAX_SAFE_INTEGER : at;
  };
  const sorted = (ids: Iterable<string>) => [...ids].filter(active).sort((a, b) => rank(a) - rank(b));
  const styleChanged = sorted(style);
  const staleOnly = sorted([...stale].filter((id) => !style.has(id)));
  return { styleChanged, stale: staleOnly, all: sorted(new Set([...styleChanged, ...staleOnly])) };
}

/** The blocks one redo can do with `left` actions (all of them without a session limit). */
export const affordable = (ids: readonly string[], left: number | null): string[] => (left === null ? [...ids] : ids.slice(0, Math.max(0, left)));
