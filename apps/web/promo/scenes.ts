// Manifest of the promo captures (`pnpm promo:capture`, docs/design/encargo-promo-capturas.md).
//
// Each scene is a state of the real app that the dev-only /promo route rebuilds deterministically
// (`/promo?scene=<id>`), and its parts are the pieces marked with `data-promo-part` that are also cut
// out on their own. The After Effects project links to the file names, so they are stable:
// `<scene>.png` (desktop screen), `<scene>-mobile.png` (390×844 screen) and `<scene>__<part>.png`.
// Renaming a scene or a part here breaks that footage.
//
// No imports: the capture script runs it in plain Node and the /promo route (PromoScene) bundles it.

export const PROMO_MANIFEST_VERSION = 2;

export const PROMO_SCENE_IDS = ["home", "logo-empty", "logo-loaded", "palette", "style", "preview", "export"] as const;
export type PromoSceneId = (typeof PROMO_SCENE_IDS)[number];

export const PROMO_LANGS = ["es", "en"] as const;
export type PromoLang = (typeof PROMO_LANGS)[number];
export const PROMO_DEFAULT_LANG: PromoLang = "es";

/** CSS viewports. `mobile` is the route's `viewport=mobile` (the app is responsive down to phones). */
export const PROMO_VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;
export type PromoViewportId = keyof typeof PROMO_VIEWPORTS;

/** Device pixel ratio of the full screens and, unless a part says otherwise, of the parts. */
export const SCREEN_DPR = 2;
export const PART_DPR = 3;

export type PromoPartSpec = {
  /** `data-promo-part` value and file suffix (`<scene>__<id>.png`). */
  id: string;
  description: string;
  /**
   * true: cut out alone over transparency (`only=<id>&bg=transparent`, `omitBackground`), with real
   * alpha. false: cropped from the scene as it is on screen (background and overlaps included).
   */
  transparent: boolean;
  /** Device pixel ratio of this part's PNG (default PART_DPR); higher for tiny vector pieces. */
  dpr?: number;
  /**
   * With `only`, the part's ancestors stop clipping it, so a part that scrolls inside a smaller box
   * (the page in the Composer's canvas) comes out whole. Its box in the screen is the whole part too.
   */
  unclip?: boolean;
};

export type PromoSceneSpec = {
  id: PromoSceneId;
  /** What the route shows: the real component and the state it is in. */
  description: string;
  /** Screens captured; parts are cut from the desktop one. */
  viewports: readonly PromoViewportId[];
  parts: readonly PromoPartSpec[];
};

export const PROMO_SCENES: readonly PromoSceneSpec[] = [
  {
    id: "home",
    description: "HomeHero at rest (step «drop»): drop zone, other ways in and the sample logos.",
    viewports: ["desktop", "mobile"],
    parts: [
      { id: "hero", description: "The whole HomeHero block.", transparent: true },
      { id: "dialmark", description: "DialMark in the AppHeader (vector, captured large).", transparent: true, dpr: 12 },
    ],
  },
  {
    id: "logo-empty",
    description: "The Home's drop zone, empty, before a logo is dropped.",
    viewports: ["desktop", "mobile"],
    parts: [{ id: "dropzone", description: "HomeHero's drop zone (DropSlot) with its sample card.", transparent: true }],
  },
  {
    id: "logo-loaded",
    description: "The fictional Brisa logo loaded in LogoCropper (step «crop»), with the colors extracted from it.",
    viewports: ["desktop", "mobile"],
    parts: [
      { id: "dropzone", description: "The crop stage holding the logo.", transparent: true },
      { id: "swatches", description: "The colors the extraction found in the logo.", transparent: true, dpr: 6 },
    ],
  },
  {
    id: "palette",
    description: "PaletteLab («1 Marca») with Brisa's extracted palette and the Landing tab of the live preview.",
    viewports: ["desktop", "mobile"],
    parts: [{ id: "palette-card", description: "The Palette Lab's left panel: logo colors, seeds, styles, scale and contrast.", transparent: true }],
  },
  {
    id: "style",
    description: "LayoutStep («2 Layout») with the Landing set (Inicio + Precios): Inicio's blocks on the canvas and the screen panel.",
    viewports: ["desktop", "mobile"],
    parts: [
      {
        id: "style-picker",
        description: "The screen panel's «Estilo» picker: every style recipe, each previewed with Inicio's blocks in the brand.",
        transparent: true,
        unclip: true,
      },
    ],
  },
  {
    id: "preview",
    description: "Composer («3 Ajustar») with Brisa's landing page, generated from the Landing set's Inicio screen.",
    viewports: ["desktop", "mobile"],
    parts: [
      {
        id: "preview-page",
        description: "The live page in the canvas' device frame, whole (the canvas shows its top and scrolls the rest).",
        transparent: true,
        unclip: true,
      },
    ],
  },
  {
    id: "export",
    description: "ExportDialog («4 Exportar») open over the Composer.",
    viewports: ["desktop", "mobile"],
    parts: [{ id: "export-dialog", description: "The export dialog.", transparent: true }],
  },
];

export const isPromoSceneId = (value: unknown): value is PromoSceneId =>
  typeof value === "string" && (PROMO_SCENE_IDS as readonly string[]).includes(value);

export const isPromoLang = (value: unknown): value is PromoLang => typeof value === "string" && (PROMO_LANGS as readonly string[]).includes(value);

export function promoScene(id: PromoSceneId): PromoSceneSpec {
  const scene = PROMO_SCENES.find((entry) => entry.id === id);
  if (!scene) throw new Error(`Unknown promo scene "${id}"`);
  return scene;
}

/** File name of a capture: `home.png`, `home-mobile.png`, `home__hero.png`. */
export function promoFileName(scene: PromoSceneId, options: { viewport?: PromoViewportId; part?: string } = {}): string {
  if (options.part) return `${scene}__${options.part}.png`;
  return options.viewport === "mobile" ? `${scene}-mobile.png` : `${scene}.png`;
}

export type PromoQuery = {
  scene: PromoSceneId;
  lang?: PromoLang;
  only?: string;
  transparent?: boolean;
  viewport?: PromoViewportId;
};

/** `/promo?scene=…` with the route's parameters (`only`, `bg=transparent`, `lang`, `viewport=mobile`). */
export function promoPath({ scene, lang, only, transparent, viewport }: PromoQuery): string {
  const params = new URLSearchParams({ scene });
  if (lang) params.set("lang", lang);
  if (only) params.set("only", only);
  if (transparent) params.set("bg", "transparent");
  if (viewport === "mobile") params.set("viewport", "mobile");
  return `/promo?${params.toString()}`;
}
