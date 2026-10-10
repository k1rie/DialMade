/** Attribute that marks a capturable piece of a scene (the manifest's part ids). */
export const PART_ATTRIBUTE = "data-promo-part";

/** Part ids are the manifest's kebab-case ids (checked by the route), so a JSON string is a valid CSS string. */
export const partSelector = (id: string) => `[${PART_ATTRIBUTE}=${JSON.stringify(id)}]`;

/**
 * Styles of the /promo route, on top of the app's: everything lands in its final state at once (no
 * transitions, animations, caret, cursor or focus ring), no toasts or dev overlay. `transparent`
 * drops the page background; `only` hides every element but that part while keeping the layout,
 * so the part keeps the exact box it has in the full scene; `unclip` lets it overflow its ancestors and
 * paints the pieces of it that fall outside the viewport (`content-visibility: auto` would skip them).
 */
export function captureCss({ only, transparent, unclip = false }: { only: string | null; transparent: boolean; unclip?: boolean }): string {
  const rules = [
    `*, *::before, *::after {
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  caret-color: transparent !important;
  cursor: none !important;
  scroll-behavior: auto !important;
}`,
    `*:focus, *:focus-visible { outline: none !important; }`,
    `[data-sonner-toaster], nextjs-portal { display: none !important; }`,
  ];
  if (transparent) {
    rules.push(`html, body { background: transparent !important; }`);
  }
  if (only) {
    const part = partSelector(only);
    rules.push(
      `body *:not(${part}, ${part} *) { visibility: hidden !important; }`,
      `${part} { visibility: visible !important; }`,
      `::backdrop { background: transparent !important; backdrop-filter: none !important; }`,
    );
    if (unclip) {
      rules.push(
        `*:has(${part}) { overflow: visible !important; }`,
        `${part}, ${part} * { content-visibility: visible !important; }`,
      );
    }
  }
  return rules.join("\n");
}
