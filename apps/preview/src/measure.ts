// Gate 5 (spec §7), the part only a browser can see: does the block overflow sideways, are interactive targets under
// 24×24 px (WCAG 2.5.8), is text clipped, how tall is it. Measured at the island's own width, or at the width of the
// block's cell on each device (`DEVICE_WIDTHS`, sent by the app): the island lays the block out at each width in turn
// within one task, so nothing is painted in between, and restores its own width. The app words the warnings
// (`responsiveGate` of @dialmade/ai-render).
export type Measurement = { width: number; overflowX: boolean; smallTargets: number; clipped: number; height: number };

const TARGETS = "a[href], button, input, select, textarea, [tabindex='0']";
/** WCAG 2.5.8 (target size, minimum). */
export const MIN_TARGET_PX = 24;

const cap = (n: number) => Math.min(n, 1000);

export function measureBlock(root: Element): Measurement {
  const width = root.clientWidth;
  const overflowX = root.scrollWidth > width + 1;
  let smallTargets = 0;
  for (const target of Array.from(root.querySelectorAll(TARGETS))) {
    const box = target.getBoundingClientRect();
    // Inline links inside a sentence are exempt in 2.5.8; a link alone in its line is a target.
    if (target.localName === "a" && isInlineInText(target)) continue;
    if (box.width > 0 && box.height > 0 && (box.width < MIN_TARGET_PX || box.height < MIN_TARGET_PX)) smallTargets++;
  }
  let clipped = 0;
  for (const element of Array.from(root.querySelectorAll("[data-dl-t]"))) {
    const el = element as HTMLElement;
    const style = getComputedStyle(el);
    const clipsX = style.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 1;
    const clipsY = style.overflowY !== "visible" && el.scrollHeight > el.clientHeight + 1 && style.webkitLineClamp === "none";
    if (clipsX || clipsY) clipped++;
  }
  return { width, overflowX, smallTargets: cap(smallTargets), clipped: cap(clipped), height: Math.ceil(root.getBoundingClientRect().height) };
}

/** A link with text siblings in the same block of text (2.5.8's inline exception). */
function isInlineInText(link: Element): boolean {
  const parent = link.parentElement;
  if (!parent || getComputedStyle(link).display !== "inline") return false;
  return Array.from(parent.childNodes).some((node) => node !== link && node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "");
}

/**
 * Measures `root` with `host` set to each of `widths` (content box), then restores `host`'s inline width. The block's
 * root is a `@container`, so its container queries answer to each width as they would in a cell that wide.
 */
export function measureAtWidths(host: HTMLElement, root: Element, widths: readonly number[]): Measurement[] {
  const previous = host.style.width;
  // The host keeps the bleed around the block (padding) and preflight makes it border-box: add the padding back.
  const style = getComputedStyle(host);
  const extra = style.boxSizing === "border-box" ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) || 0 : 0;
  try {
    return widths.map((width) => {
      host.style.width = `${width + extra}px`;
      // Reported at the width asked for, so the app maps it back to its device.
      return { ...measureBlock(root), width };
    });
  } finally {
    host.style.width = previous;
  }
}
