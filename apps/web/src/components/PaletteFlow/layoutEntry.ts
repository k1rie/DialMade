// Opening «Layout» from elsewhere in the flow. Pure (type-only imports): the flow never imports the Layout chunk.
import type { LayoutStore, ScreensSource } from "@/components/LayoutStep";

/**
 * Brings the draft in line with the document first (what LayoutStep's first render would do), so a screen only the
 * document had (brought back by an undo in «Ajustar») exists in it; then, when `key` is given (coming from
 * «Ajustar»: «Editar layout», «Layout» in the stepper), that screen becomes the draft's active one. Without `key`
 * (from «Marca») the draft keeps the screen it was on.
 */
export function enterLayout(store: LayoutStore | undefined, doc: ScreensSource | null, key: string | null): void {
  if (!store) return;
  const { actions } = store.getState();
  if (doc) actions.syncFromDoc(doc);
  if (key && Object.hasOwn(store.getState().screens, key)) actions.setActiveScreen(key);
}
