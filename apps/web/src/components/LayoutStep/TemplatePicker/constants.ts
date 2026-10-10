/*
 * Look of the template picker's large cards, shared by KindCard and BlankCard (the treatment of the old
 * «¿Qué quieres crear?» cards): surface card with a hover lift, preview on top.
 */

/** Outer focusable element: the focus ring sits outside the card. */
export const CARD_FRAME =
  "group h-full w-full rounded-panel text-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

/** The card itself (`group` is on the frame). */
export const CARD_SURFACE =
  "flex h-full flex-col gap-4 rounded-[inherit] border border-app bg-surface p-2.5 pb-5 shadow-surface " +
  "transition-[border-color,background-color,translate] duration-200 ease-out " +
  "group-hover:border-app-strong group-hover:bg-surface-hover motion-safe:group-hover:-translate-y-0.5";

/** Preview area: same aspect on every card so names and descriptions line up. */
export const CARD_PREVIEW =
  "relative flex aspect-[8/5] w-full items-center justify-center overflow-hidden rounded-card bg-app px-3 shadow-[0_0_0_1px_oklch(1_0_0/0.06)]";

/** Design size of the minis (@dialmade/sections); they are scaled to fit their box. */
export const MINI_SIZE = { width: 320, height: 200 } as const;
