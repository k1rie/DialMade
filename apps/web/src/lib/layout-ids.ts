/** Shared `layoutId`s for the logo → swatches signature moment (LogoCropper → LogoBurst → PaletteLab). */
export const logoLayoutId = "logo";

export const swatchLayoutId = (index: number): string => `swatch-${index}`;

/**
 * «Layout» → «Ajustar»: a frame grows into the Composer's canvas (and back). Only the Composer carries it now;
 * its partner in the Layout step (the canvas, with the signature moment) comes in wave 3.
 */
export const canvasLayoutId = "design-canvas";
