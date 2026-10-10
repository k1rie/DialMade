// The only import of the heavy preview (ThemeScope + @dialmade/sections minis + @dialmade/doc): a dynamic one,
// so the Home bundle never carries it. Called early by the Palette Lab to warm it up.
export const loadPreviewStage = () => import("./PreviewStage").then((m) => m.PreviewStage);
