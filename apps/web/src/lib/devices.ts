import type { Breakpoint } from "@dialmade/layout";

/*
 * Device frames of the app: the Composer's preview and the Layout canvas. The single source of the device
 * union, the frame widths and their order.
 */

/**
 * The one device union of the app. It is the layout engine's `Breakpoint`; `PreviewDevice`
 * (hooks/useDesignDoc) is this same type.
 */
export type Device = Breakpoint;

/** Width of the frame per device, in design px. */
export const DEVICE_WIDTHS: Readonly<Record<Device, number>> = {
  mobile: 390,
  tablet: 768,
  desktop: 1440,
};

/** Order of the device switchers, narrowest first. */
export const DEVICE_ORDER: readonly Device[] = ["mobile", "tablet", "desktop"];

/** Grid columns per device: desktop is drawn, tablet (8) and mobile (4) are derived by `deriveResponsive`. */
export const DEVICE_COLUMNS = { desktop: 12, tablet: 8, mobile: 4 } as const satisfies Readonly<Record<Device, number>>;
