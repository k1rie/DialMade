/**
 * Layout Mode types. Provisional until Fase B, when `@dialmade/doc` adopts `LayoutDoc` in its schema
 * (DesignDoc v2, `Screen.layout`). Everything is plain JSON: no classes, no Dates, no functions.
 */

/** Block id: `b-` + 6 base36 chars for new blocks; ids of existing pages (`hero-1`) are kept as they are. */
export type BlockId = string;
/** Inferred region id: `r-` + hash of the block ids it holds. Not addressable: it changes with its members. */
export type RegionId = string;
export type ScreenId = string;

export type Breakpoint = "desktop" | "tablet" | "mobile";
export type DerivedBreakpoint = Exclude<Breakpoint, "desktop">;
/** Screen kind. The template sets it; it is never inferred from the blocks. */
export type ScreenKind = "landing" | "app";

/** Rect in grid units, always integers: `col`/`w` in columns (0-based col), `row`/`h` in rows of `rowUnit` px. */
export type GridRect = { col: number; row: number; w: number; h: number };

export type ReadyBlockType =
  | "navbar"
  | "sidebar"
  | "footer"
  | "hero"
  | "features"
  | "logos"
  | "testimonials"
  | "pricing"
  | "cta"
  | "kpis"
  | "chart"
  | "table"
  | "activity"
  | "settings"
  | "modal"
  | "empty"
  | "text"
  | "media"
  | "cards"
  | "calendar"
  | "list"
  | "form"
  | "free"
  | "container";

export type SoonBlockType =
  | "tabs"
  | "stepper"
  | "pagination"
  | "faq"
  | "banner"
  | "timeline"
  | "kanban"
  | "search"
  | "upload"
  | "notifications"
  | "gallery"
  | "chat"
  | "profile"
  | "map"
  | "cart"
  | "checkout"
  | "video";

export type LibraryBlockType = ReadyBlockType | SoonBlockType;

/** Library categories, in display order (spec §3.2). `basics` holds «Bloque libre» and «Contenedor». */
export type BlockCategory = "basics" | "navigation" | "content" | "data" | "forms" | "overlays" | "commerce";

/** How a block behaves when it drops to mobile (and to tablet when it does not fit). */
export type MobileBehavior =
  | "stack"
  | "hamburger"
  | "drawer"
  | "tabbar"
  | "grid-2x2"
  | "one-column"
  | "carousel"
  | "card-list"
  | "agenda"
  | "text-first"
  | "sheet"
  | "accordion"
  | "scroll-x"
  | "hide";

/** Per-device settings of a block. MVP: visibility and behavior; `order` arrives in v1.1. */
export type BlockOverride = { hidden?: boolean; behavior?: MobileBehavior; order?: number };

/** Fingerprint of the last «Generar»: lets a regenerate touch only what changed (critique #3). */
export type GeneratedFingerprint = {
  type: LibraryBlockType;
  w: number;
  h: number;
  count?: number;
  variant: string;
  noteHash?: string;
};

export type LayoutBlock = {
  type: LibraryBlockType;
  /** Visible name, one line (`sanitizeLabel`). */
  label: string;
  /** «calendario semanal»: one line, ≤200 chars, cleaned with `sanitizeNote`. Data, never instructions. */
  note?: string;
  /** ×N on repeatable blocks. */
  count?: number;
  /** Absolute in the screen grid, also for nested blocks. */
  rect: GridRect;
  /** Explicit nesting (dropped inside a container). Never inferred by `inferStructure`. */
  parentId?: BlockId;
  z: number;
  /** Hiding lives in the layout; `page.hidden` is compiled from here (Fase B). */
  hidden?: boolean;
  /** Props the user edited: regenerating never touches them. */
  pinned?: string[];
  generated?: GeneratedFingerprint;
  responsive?: { tablet?: BlockOverride; mobile?: BlockOverride };
  /** Link to another screen (preview navigation and export). */
  linkTo?: ScreenId;
};

export type LayoutDoc = {
  version: 1;
  /** Desktop. Tablet (8) and mobile (4) are derived. */
  columns: 12;
  /** px per row. */
  rowUnit: 8;
  /** A record, not an array: stable pointers for patches, locks and undo. */
  blocks: Record<BlockId, LayoutBlock>;
};

/** Navigation of an app screen: a frame with a fixed selector, not loose blocks (critique #4). */
export type AppNav = "sidebar" | "rail" | "topnav" | "none";
export type AppShell = { nav: AppNav; header: boolean; activeItem?: string };

/* ------------------------------------------------------------------------------------------------ */
/* Library metadata                                                                                 */
/* ------------------------------------------------------------------------------------------------ */

/** Icon key; the app maps each one to its SVG (`LayoutStep/icons.tsx`). One per block type. */
export type BlockIcon = LibraryBlockType;

/** What the canvas chip says the block will generate («Tabla · 8 filas»). */
export type ContentEstimate =
  | { kind: "count"; unit: "rows" | "items" | "plans" | "logos" | "fields" | "columns" | "links"; value: number }
  | { kind: "variant"; value: string }
  | { kind: "ratio"; value: string };

export type LibraryBlockDef = {
  type: LibraryBlockType;
  category: BlockCategory;
  icon: BlockIcon;
  status: "ready" | "soon";
  /** Target section in `@dialmade/sections` (`landing.hero`, `app.kpiRow`, `ui.cards`…). Soon blocks → `ui.placeholder`. */
  sectionType: string;
  /** Desktop size in grid units (columns × rows of 8 px). */
  defaultSize: { w: number; h: number };
  /** Narrowest width, in columns of each breakpoint, before the block wraps (tablet) or changes behavior. */
  minCols: Record<Breakpoint, number>;
  /** Containers adopt children explicitly (`parentId`). */
  container: boolean;
  /** Child types that mean something inside this block (a media inside a hero → split). `"any"` for containers. */
  accepts: "any" | readonly LibraryBlockType[];
  /** ×N bounds; `null` when the block is not repeatable. */
  repeatable: { min: number; max: number; default: number } | null;
  /** Default mobile behavior and the ones the inspector offers. */
  mobile: MobileBehavior;
  mobileOptions: readonly MobileBehavior[];
  /** Lives in the absolute overlay layer, outside the XY-cut (modal). */
  overlay: boolean;
  /** In app screens this block is the navigation frame selector, not a block. */
  frame: Exclude<AppNav, "none" | "rail"> | null;
  /** Screen kinds where the block is suggested first. Every block can be placed on any screen kind except frame blocks. */
  kinds: readonly ScreenKind[];
};

/* ------------------------------------------------------------------------------------------------ */
/* Inference                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

/** Column span a node occupies inside its parent (absolute columns). */
export type Frame = { col: number; w: number };

/** A child laid out inside a stack or a row: `start` is 0-based and relative to the parent's frame. */
export type Placement = { node: StructureNode; start: number; span: number };

type NodeBase = {
  /** Bounding box of every block under the node (absolute grid units). */
  rect: GridRect;
  /** Columns available to the node's children. */
  frame: Frame;
};

/** A block. `content` lays out its explicit children (`parentId`) inside it. */
export type BlockNode = NodeBase & { kind: "block"; id: BlockId; content: StructureNode | null };

/** Children top to bottom. `gaps[i]` = rows between `children[i]` and `children[i + 1]` (≥ 0). */
export type StackNode = NodeBase & { kind: "stack"; id: RegionId; children: Placement[]; gaps: number[] };

/** Children left to right, each in its own column band; offsets inside `frame` are kept. */
export type RowNode = NodeBase & { kind: "row"; id: RegionId; children: Placement[] };

/** No clean cut (bento, pinwheel, overlaps): tracks from the unique edges. Lines are 1-based. */
export type GridNode = NodeBase & {
  kind: "grid";
  id: RegionId;
  /** Track sizes: columns in grid columns, rows in grid rows. */
  columns: number[];
  rows: number[];
  items: { node: StructureNode; colStart: number; colEnd: number; rowStart: number; rowEnd: number }[];
  /** `grid-template-areas` rows; `null` when items overlap (then only line placement is valid). */
  areas: string[] | null;
};

export type StructureNode = BlockNode | StackNode | RowNode | GridNode;

export type LayoutWarningCode =
  | "overlap"
  | "implicit-containment"
  | "outside-parent"
  | "missing-parent"
  | "cycle"
  | "not-accepted"
  | "out-of-bounds"
  | "invalid-rect"
  | "too-many-blocks";

/** A one-click fix the canvas can offer («Anidar», «Poner debajo»…). Applied with `applyFix`. */
export type LayoutFix =
  | { kind: "nest"; id: BlockId; parentId: BlockId }
  | { kind: "unparent"; id: BlockId }
  | { kind: "move-below"; id: BlockId; below: BlockId }
  | { kind: "clip"; id: BlockId; rect: GridRect }
  | { kind: "fit-inside"; id: BlockId; rect: GridRect };

export type LayoutWarning = {
  code: LayoutWarningCode;
  /** Blocks involved, in a stable order. */
  ids: BlockId[];
  /** Fixes, best first. Empty when only a manual edit can solve it. */
  fixes: LayoutFix[];
  /** Overlap: shared area / smaller block's area, 0–1. */
  ratio?: number;
};

export type Structure = {
  /** `null` for an empty layout (or one with only overlays). */
  root: StructureNode | null;
  /** Overlay blocks (modal…), outside the flow, sorted by (row, col, z, id). */
  overlays: BlockNode[];
  /** Reading order of every block: DOM, focus, layers and mobile stacking. Overlays go last. */
  order: BlockId[];
  warnings: LayoutWarning[];
};

/* ------------------------------------------------------------------------------------------------ */
/* Responsive                                                                                       */
/* ------------------------------------------------------------------------------------------------ */

/** What a region does at a derived breakpoint. `spans`/`starts` follow the node's children order. */
export type NodePlan =
  | { mode: "keep"; spans: number[]; starts: number[] }
  | { mode: "wrap"; spans: number[] }
  | { mode: "stack" };

export type DerivedBlock = {
  /** Rect in the breakpoint's columns; `null` when hidden. */
  rect: GridRect | null;
  behavior: MobileBehavior;
  hidden: boolean;
};

export type BreakpointLayout = {
  breakpoint: DerivedBreakpoint;
  columns: 8 | 4;
  /** Every block of the layout, hidden ones included. */
  blocks: Record<BlockId, DerivedBlock>;
  /** Plans per region id (and per block id for blocks with content). */
  nodes: Record<string, NodePlan>;
  /** Visible blocks in stacking order. */
  order: BlockId[];
};

export type ResponsiveLayout = { tablet: BreakpointLayout; mobile: BreakpointLayout };

/* ------------------------------------------------------------------------------------------------ */
/* Editing                                                                                          */
/* ------------------------------------------------------------------------------------------------ */

/** What the canvas changed on drop, to animate it and offer «Ajustado · Deshacer». */
export type Adjustment =
  | { kind: "clamp"; id: BlockId; from: GridRect; to: GridRect }
  | { kind: "clip"; id: BlockId; from: GridRect; to: GridRect }
  | { kind: "nest"; id: BlockId; parentId: BlockId }
  | { kind: "unnest"; id: BlockId; parentId: BlockId };

export type NoteKeyword =
  | "weekly"
  | "monthly"
  | "yearly"
  | "daily"
  | "agenda"
  | "search"
  | "login"
  | "signup"
  | "contact"
  | "split"
  | "carousel";

export type ParsedNote = { count?: number; keywords: NoteKeyword[] };

/* ------------------------------------------------------------------------------------------------ */
/* Templates                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

export type ScreenTemplateId =
  | "home"
  | "pricing"
  | "login"
  | "dashboard"
  | "settings"
  | "detail"
  | "list"
  | "checkout"
  | "profile"
  | "blank";

export type SetTemplateId = "saas-app" | "landing";

/** `parent` is the index of another block of the same template. */
export type TemplateBlock = {
  type: LibraryBlockType;
  rect: GridRect;
  count?: number;
  parent?: number;
  /** Starting note (data for the copy), when the template's purpose needs one: the Login form says `Login`. */
  note?: string;
};

export type ScreenTemplate = {
  id: ScreenTemplateId;
  /** `null` for «En blanco»: the app asks «¿Web pública o pantalla de app?». */
  kind: ScreenKind | null;
  shell: AppShell | null;
  blocks: readonly TemplateBlock[];
};

export type SetTemplate = { id: SetTemplateId; screens: readonly ScreenTemplateId[] };
