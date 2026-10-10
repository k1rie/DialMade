import { STYLE_PICKER_ATTR } from "./constants";

/**
 * Moves focus to the style picker's tabbable option (the chosen style, else the first). For the «Estilo»
 * chip of the top bar: call it after `select(null)` has rendered the screen panel (e.g. in a
 * requestAnimationFrame). Returns `false` when no picker is mounted under `root`.
 */
export function focusStylePicker(root: ParentNode = document): boolean {
  const target = root.querySelector<HTMLElement>(`[${STYLE_PICKER_ATTR}] [role="radio"][tabindex="0"]`);
  if (!target) return false;
  target.focus();
  return true;
}
