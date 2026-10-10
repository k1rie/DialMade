import type { CSSProperties } from "react";

/**
 * A modal <dialog> sits in the top layer, above the app's Toaster: the report mounts its own one (same
 * look as Providers) and its copy toasts target it. Same pattern as ExportDialog.
 */
export const REPORT_TOASTER_ID = "layout-report";

/** Copy of ExportDialog's TOASTER_STYLE (component-private there); Fase B can share one in src/lib. */
export const REPORT_TOASTER_STYLE = {
  "--normal-bg": "var(--app-bg-elevated)",
  "--normal-border": "var(--app-border-strong)",
  "--normal-text": "var(--app-text)",
  "--border-radius": "14px",
  "--width": "360px",
  fontFamily: "var(--font-sans)",
} as CSSProperties;

/** How long the copy button shows its check after a copy (feedback, not a state change). */
export const COPIED_MS = 1600;
