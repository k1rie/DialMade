// Gate 5 (spec §7), the part only a browser can see: at the island's current width, does the block overflow
// sideways, are interactive targets under 24×24 px (WCAG 2.5.8), is text clipped. Reported to the app, which
// words the warning. Track D finishes the 3-width measurement.
export type Measurement = { width: number; overflowX: boolean; smallTargets: number; clipped: number };

const TARGETS = "a[href], button, input, select, textarea, [tabindex='0']";

export function measureBlock(root: Element): Measurement {
  const width = root.clientWidth;
  const overflowX = root.scrollWidth > width + 1;
  let smallTargets = 0;
  for (const target of Array.from(root.querySelectorAll(TARGETS))) {
    const box = target.getBoundingClientRect();
    if (box.width > 0 && box.height > 0 && (box.width < 24 || box.height < 24)) smallTargets++;
  }
  let clipped = 0;
  for (const element of Array.from(root.querySelectorAll("[data-dl-t]"))) {
    const el = element as HTMLElement;
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible") clipped++;
  }
  return { width, overflowX, smallTargets: Math.min(smallTargets, 1000), clipped: Math.min(clipped, 1000) };
}
