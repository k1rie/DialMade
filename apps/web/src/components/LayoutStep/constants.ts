import type { AppShell } from "@dialmade/layout";
import type { LayoutRegion } from "./types";

/** Undo steps kept by the layout store (screens + screen order). */
export const HISTORY_LIMIT = 100;

/** localStorage key of the single-key shortcuts switch (WCAG 2.1.4). */
export const SHORTCUTS_STORAGE_KEY = "dialmade.layout.shortcuts";

/** Shell of a new app screen when no other app screen has navigation yet. */
export const DEFAULT_APP_SHELL: Readonly<AppShell> = { nav: "sidebar", header: true };

/** Rows «+ Añadir espacio» adds at the bottom of the frame (40 × 8 px). */
export const ADD_SPACE_ROWS = 40;

/** Frame height in rows: max(layout bottom + FRAME_PAD_ROWS, FRAME_MIN_ROWS) + extra rows. */
export const FRAME_MIN_ROWS = 100;
export const FRAME_PAD_ROWS = 24;

/** Gutter around the device frame inside the canvas scroller, in screen px. */
export const FRAME_GUTTER_PX = 32;

/** App navigation frame sizes in design px (multiply by k = frame width / device width). */
export const NAV_FRAME_PX = { sidebar: 256, rail: 72, topnav: 64 } as const;
/** Page header strip above the content of an app screen (`shell.header`), in design px. */
export const HEADER_STRIP_PX = 88;

/** Under this viewport width the canvas is replaced by the narrow fallback (no free drag). */
export const NARROW_QUERY = "(max-width: 639px)";

/** Attribute that marks an F6 area. The canvas-only shortcuts check focus with `regionSelector("canvas")`. */
export const REGION_ATTR = "data-layout-region";
/** An element inside an area that F6 focuses first when the area has no remembered focus. */
export const REGION_AUTOFOCUS_ATTR = "data-region-autofocus";

export const regionSelector = (region: LayoutRegion): string => `[${REGION_ATTR}="${region}"]`;

/** Id of the inspector's name input: F2 on a block focuses it. */
export const INSPECTOR_NAME_ID = "layout-inspector-name";

/** Height handling like the Composer: on large screens the step fills the viewport below it. */
export const LAYOUT_MIN_HEIGHT = 600;
export const LAYOUT_BOTTOM_GAP = 24;
