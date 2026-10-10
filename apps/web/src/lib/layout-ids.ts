/** Shared `layoutId`s for the logo → swatches signature moment (LogoCropper → LogoBurst → PaletteLab). */
export const logoLayoutId = "logo";

export const swatchLayoutId = (index: number): string => `swatch-${index}`;

/**
 * «Layout» → «Ajustar»: the frame of the Layout canvas (LayoutCanvas) grows into the Composer's canvas
 * (CanvasViewport) and back. Only the frames share it, never the blocks or the page, so nothing is stretched.
 */
export const canvasLayoutId = "design-canvas";
