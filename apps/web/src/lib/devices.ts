import type { Breakpoint } from "@dialmade/layout";

/*
 * Device frames of the Layout canvas. Copy made in Fase A of `DEVICE_WIDTHS` and `DEVICE_ORDER` from
 * `components/Composer/constants.ts` (Composer is outside the Fase A zone); Fase B removes the Composer
 * one and points it here.
 */

/** Same union as `PreviewDevice` (hooks/useDesignDoc) and `Breakpoint` (@dialmade/layout). */
export type Device = "desktop" | "tablet" | "mobile";

/** Width of the frame per device, in design px. */
export const DEVICE_WIDTHS: Readonly<Record<Device, number>> = {
  mobile: 390,
  tablet: 768,
  desktop: 1440,
};

export const DEVICE_ORDER: readonly Device[] = ["mobile", "tablet", "desktop"];

/**
 * Grid columns per device: desktop is drawn, tablet (8) and mobile (4) are derived by `deriveResponsive`.
 * `satisfies` keys it by the package's `Breakpoint`, so the two unions cannot drift apart silently.
 */
export const DEVICE_COLUMNS = { desktop: 12, tablet: 8, mobile: 4 } as const satisfies Readonly<Record<Breakpoint, number>>;
