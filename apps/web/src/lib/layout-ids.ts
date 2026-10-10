/** Shared `layoutId`s for the logo → swatches signature moment (LogoCropper → LogoBurst → PaletteLab). */
export const logoLayoutId = "logo";

export const swatchLayoutId = (index: number): string => `swatch-${index}`;

/** «Crear» → «Ajustar»: the chosen mini's frame grows into the Composer's canvas (and back). */
export const canvasLayoutId = "design-canvas";
