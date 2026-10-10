/**
 * Where Tab takes focus out of a popover, or `null` while it stays inside. `focusable` holds the panel's
 * focusable elements in order; the panel itself is focused only when it was opened without any.
 * "before": Shift+Tab on the first one. "after": Tab on the last one.
 */
export function tabExit<T>(focusable: readonly T[], active: T | null, panel: T, shiftKey: boolean): "before" | "after" | null {
  if (active === panel) return shiftKey ? "before" : focusable.length === 0 ? "after" : null;
  if (active === null || !focusable.includes(active)) return null;
  if (shiftKey) return active === focusable[0] ? "before" : null;
  return active === focusable[focusable.length - 1] ? "after" : null;
}
