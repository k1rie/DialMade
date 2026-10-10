/**
 * The two ways to start on «¿Qué vas a construir?» («Descríbelo» and «Dibújalo tú») share one card look, so neither
 * reads as the main road and the other as an escape hatch. The same surface as the old «Describe» panel.
 */
export const PATH_CARD = "flex h-full min-w-0 flex-col gap-4 rounded-panel border border-app bg-app-elevated/70 p-4 shadow-surface sm:p-5";

/** The tile that holds each path's glyph. */
export const PATH_GLYPH =
  "flex size-10 shrink-0 items-center justify-center rounded-card border border-app-strong bg-surface text-accent shadow-surface [&_svg]:size-6";
