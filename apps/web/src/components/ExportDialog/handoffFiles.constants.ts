// Names of the Figma and TSX exports, shared by the dialog (eager) and handoffFiles (lazy, with @dialmade/handoff).

/** File names of the Figma and TSX exports, in the dialog and inside the code ZIP. */
export const HANDOFF_FILES = {
  figmaPlan: "figma-plan.json",
  tsxDir: "tsx",
} as const;

/** Where the app serves the built plugin (apps/web/scripts/figma-plugin.mjs writes it before dev and build). */
export const FIGMA_PLUGIN_ZIP = "/downloads/dialmade-figma-plugin.zip";
