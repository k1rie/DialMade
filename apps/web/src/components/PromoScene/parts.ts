import { create } from "@/i18n/create";
import { home } from "@/i18n/home";
import { palette } from "@/i18n/palette";
import type { PromoLang, PromoSceneId } from "../../../promo/scenes";

/**
 * Where each part of a scene is in the real components' DOM, found by its landmarks (the step region
 * PromoScene renders, accessible names from the app's dictionaries, stable data attributes) and
 * marked with `data-promo-part` by the route, so no component changes for the captures.
 * `ready` holds the part back while it is still settling (e.g. colors still being extracted).
 */
export type PartLocator = {
  find: (root: Document) => Element | null;
  ready?: (element: Element) => boolean;
};

const byLabel = (root: Document, label: string, scope = "main") => root.querySelector(`${scope} [aria-label=${JSON.stringify(label)}]`);
/** Root element of the real component in the step region (FlowShell's `<section data-step>`). */
const stepRoot = (root: Document, step: string) => root.querySelector(`main section[data-step=${JSON.stringify(step)}] > *`);

/** The `<h3>` with `title` in `main` and the element right after it. */
function afterHeading(root: Document, title: string): Element | null {
  const heading = [...root.querySelectorAll("main h3")].find((element) => element.textContent?.trim() === title);
  return heading?.nextElementSibling ?? null;
}

export function partLocators(scene: PromoSceneId, lang: PromoLang): Record<string, PartLocator> {
  switch (scene) {
    case "home":
      return {
        hero: { find: (root) => stepRoot(root, "drop") },
        // The AppHeader (root layout) carries the DialMark next to the app name.
        dialmark: { find: (root) => root.querySelector('body > header a[href="/"] > svg') },
      };
    case "logo-empty":
      return { dropzone: { find: (root) => byLabel(root, home[lang].hero.zoneLabel) } };
    case "logo-loaded":
      return {
        // The crop frame (role="application") sits inside the stage that holds the logo.
        dropzone: { find: (root) => byLabel(root, home[lang].crop.areaLabel)?.parentElement ?? null },
        swatches: {
          find: (root) => afterHeading(root, home[lang].crop.colors),
          // useCropColors: dimmed while the worker extracts, then one <li title="#HEX"> per color.
          ready: (element) => !element.classList.contains("opacity-50") && element.querySelector("li[title]") !== null,
        },
      };
    case "palette":
      return { "palette-card": { find: (root) => byLabel(root, palette[lang].lab.controls) } };
    case "style":
      return { "style-picker": { find: (root) => byLabel(root, create[lang].options) } };
    case "preview":
      // The canvas' browser frame: the bar (device width · scale) and the scaled page under it.
      return { "preview-page": { find: (root) => root.querySelector("main [data-canvas-background]") } };
    case "export":
      return { "export-dialog": { find: (root) => root.querySelector("dialog[open]") } };
  }
}
