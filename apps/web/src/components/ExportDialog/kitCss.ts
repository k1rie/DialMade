// The kit CSS of @dialmade/ui and @dialmade/sections as text, for the exported HTML. ./text-loader.cjs
// (a Turbopack loader set per import) inlines each package's stylesheet entry, so it always matches
// the components the app renders. Imported on demand from useExportActions.
import uiCss from "@dialmade/ui/styles.css" with { turbopackLoader: "./text-loader.cjs", turbopackAs: "*.js" };
import sectionsCss from "@dialmade/sections/styles.css" with { turbopackLoader: "./text-loader.cjs", turbopackAs: "*.js" };
import type { KitCss } from "./exportPack";

export const kitCss: KitCss = { ui: uiCss, sections: sectionsCss };
