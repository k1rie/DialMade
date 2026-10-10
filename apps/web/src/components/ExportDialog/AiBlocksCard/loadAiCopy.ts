// What «Copiar HTML / TSX» needs, loaded when the card mounts: the sanitizer, the TSX transform and the vocabulary
// (@dialmade/ai-render brings parse5), kept out of the dialog's own chunk.
export const loadAiCopy = () =>
  Promise.all([import("../aiBlocks"), import("@dialmade/ai-render")]).then(([blocks, render]) => ({
    aiExportBlocks: blocks.aiExportBlocks,
    blockHtmlText: blocks.blockHtmlText,
    blockTsxText: blocks.blockTsxText,
    screenRoutes: blocks.screenRoutes,
    exportThemeCss: render.exportThemeCss,
    tsxAssetsModule: render.tsxAssetsModule,
  }));

export type AiCopy = Awaited<ReturnType<typeof loadAiCopy>>;
