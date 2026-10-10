/** Seconds the logo takes to fly in from the crop rectangle. */
export const LANDING_S = 0.3;
/** Long side of the logo box, px. */
export const LOGO_BOX = 168;
/** Swatch side and gap in the burst row, px. */
export const PIECE = 40;
export const PIECE_GAP = 10;

/** Lets the logo land from the cropper (layoutId, LANDING_S) before it breaks. State transition: ≤400 ms. */
export const HOLD_MS = 300;
/** Seconds per piece flight and stagger between pieces. */
export const PIECE_DURATION = 0.34;
export const PIECE_STAGGER = 0.014;
/**
 * Burst time before handing off to the Palette Lab. The pieces are still landing: their flight goes on
 * into the Lab's grid (`swatchFlight`), so hold + burst + flight stays within the 900 ms signature budget.
 */
export const BURST_MS = 320;
/** Passes of the «extracting» sweep while the worker runs; then it holds still (no endless loop). */
export const SWEEP_PASSES = 3;
/** Reduced motion: plain fade, then hand off. */
export const REDUCED_MS = 220;
