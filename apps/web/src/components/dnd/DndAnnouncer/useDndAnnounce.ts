"use client";

import { useCallback, useContext } from "react";
import { DndAnnounceContext, type DndAnnounce, type DndPoliteness } from "./context";

export type DndAnnounceOptions = {
  /**
   * Region the returned function speaks in when a call does not pick one. Defaults to `assertive` (what
   * every caller had before the polite region existed). Confirmations should be `polite`; errors, `assertive`.
   */
  politeness?: DndPoliteness;
};

/**
 * Announces a message in a DnD live region, e.g. after a click/keyboard alternative to dragging. The returned
 * function takes an optional politeness per call (e.g. a polite caller that reports an error).
 */
export function useDndAnnounce({ politeness = "assertive" }: DndAnnounceOptions = {}): DndAnnounce {
  const announce = useContext(DndAnnounceContext);
  return useCallback((message: string, override?: DndPoliteness) => announce?.(message, override ?? politeness), [announce, politeness]);
}
