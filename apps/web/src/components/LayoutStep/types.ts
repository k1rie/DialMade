import type { DesignDoc } from "@dialmade/doc";
import type {
  Adjustment,
  AppNav,
  AppShell,
  BlockId,
  GeneratedFingerprint,
  InsertResult,
  LayoutBlock,
  LayoutDoc,
  LayoutWarning,
  ResponsiveLayout,
  ScreenId,
  ScreenKind,
  Structure,
} from "@dialmade/layout";

/** Canvas tool of the bottom bar: Dibujar (R) · Editar (V) · Mano (H). */
export type Tool = "draw" | "edit" | "hand";

/**
 * One screen of the project. `shell` is non-null only for app screens (the navigation frame); its `nav`
 * is shared by every app screen that has navigation (see `setShell`).
 */
export type Screen = {
  id: ScreenId;
  name: string;
  kind: ScreenKind;
  /** "/" for the first landing screen, else "/" + a unique slug of the name. */
  route: string;
  layout: LayoutDoc;
  shell: AppShell | null;
};

/** A recipe id from `@dialmade/catalog`, or `"guide"` for «Tu guía de estilo» (an imported guide). */
export type StyleChoice = string;

/** Tabs of the lower left panel. */
export type LeftTab = "blocks" | "layers";

/** Areas F6 / Shift+F6 cycle through (each is a landmark with `data-layout-region`). */
export type LayoutRegion = "screens" | "library" | "layers" | "canvas" | "inspector";

/** Editable props of a block (`updateBlock`). Geometry goes through `setRect`. */
export type BlockPatch = Partial<Pick<LayoutBlock, "label" | "note" | "count" | "type" | "linkTo" | "responsive" | "hidden">>;

/**
 * What `insertBlock` did: `id` of the new block, or `nav` when a frame block (navbar, sidebar) on an app
 * screen changed the navigation frame instead. Both `null` when nothing was inserted (no screen).
 */
export type InsertOutcome = {
  id: BlockId | null;
  nav: AppNav | null;
  adjustments: Adjustment[];
  /** The container grew to make room (inserting into a full container). */
  grown?: InsertResult["grown"];
};

/** What `updateBlock` did. `nav` is set when a type change to a frame block became the app's navigation. */
export type UpdateOutcome = { changed: boolean; nav: AppNav | null };

/** Why `setRoute` refused a route. */
export type RouteResult = { ok: true; route: string } | { ok: false; reason: "invalid" | "taken" | "missing" };

/** One screen of a «Generar» result: everything Fase B needs to compile and export it. */
export type GeneratedScreen = {
  screenId: ScreenId;
  name: string;
  kind: ScreenKind;
  route: string;
  shell: AppShell | null;
  layout: LayoutDoc;
  structure: Structure;
  responsive: ResponsiveLayout;
  css: string;
  ascii: string;
  warnings: LayoutWarning[];
};

/** Output of `generate()`: every screen in order, and how many blocks changed since the previous run. */
export type GenerateResult = { screens: GeneratedScreen[]; changed: number };

/** Fingerprints of the last «Generar», per screen and block (the baseline of «Regenerar N bloques»). */
export type GeneratedPrints = Record<ScreenId, Record<BlockId, GeneratedFingerprint>>;

/** Public props of the Layout step (the API Fase B wires into the flow). */
export type LayoutStepProps = {
  /** Brand and brief: palette for the style previews, productType, locale. */
  doc: DesignDoc;
  /** Screens to start with; without them the template picker shows. Read once, on mount. */
  initialScreens?: Screen[];
  /** Shows «Tu guía de estilo» first in the style picker. */
  hasImportedGuide?: boolean;
  /** Chosen style. When it changes from outside the store follows it. */
  style?: StyleChoice;
  /** Called when the user picks another style (Fase B → `actions.setRecipe`). */
  onStyleChange?(style: StyleChoice): void;
  /** Called after every «Generar». */
  onGenerate?(result: GenerateResult): void;
  /** Hover or focus on «Generar» (Fase B: preload the Composer chunk). */
  onGenerateIntent?(): void;
  className?: string;
};

/** Context the LayoutStep children read besides the store (props of LayoutStep and layout facts). */
export type LayoutEnv = {
  doc: DesignDoc;
  hasImportedGuide: boolean;
  /** Viewport under 640 px: the canvas is replaced by layers + «Añadir bloque» + inspector. */
  narrow: boolean;
  onGenerateIntent?: () => void;
  /** Moves focus into an area, like F6 (the «Estilo» chip focuses the inspector, «Añadir bloque» the library). */
  focusRegion: (region: LayoutRegion) => void;
};
