"use client";

import type { DesignDoc } from "@dialmade/doc";
import { useCallback, useSyncExternalStore } from "react";
import type { LayoutStore } from "@/components/LayoutStep";

/**
 * Whether the Layout draft has changes the document does not have yet (`hasPendingChanges`, memoized per version of
 * either side), so «Ajustar» and «Exportar» show an older generation. `false` while `enabled` is off (it only matters
 * there) and before there is a draft. Reads the store through its own actions: PaletteFlow never imports the Layout
 * chunk.
 */
export function usePendingLayout(store: LayoutStore | undefined, doc: DesignDoc | null, enabled: boolean): boolean {
  const subscribe = useCallback((onChange: () => void) => (store && enabled ? store.subscribe(onChange) : () => {}), [store, enabled]);
  const read = () => (store && doc && enabled ? store.getState().actions.hasPendingChanges(doc) : false);
  return useSyncExternalStore(subscribe, read, () => false);
}
