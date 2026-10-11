// The postMessage protocol between the app and an AI island (spec §6.1 [C6]): one sandboxed iframe of the preview
// origin per AI block. Both sides validate every message with these schemas. The parent checks
// `event.source === iframe.contentWindow` (the sandboxed document has an opaque origin, `"null"`); the island checks
// `event.origin` against the app origin it was given. The island never receives the BYOK key or the document:
// only sanitized HTML, compiled CSS and the theme variables.
import { z } from "zod";

export const ISLAND_PROTOCOL_VERSION = 1;
/** Island height cap (spec §6.1). */
export const MAX_ISLAND_HEIGHT = 4000;
/** Inner margin the island keeps around the block so shadows are not clipped (the parent compensates it). */
export const ISLAND_BLEED = 24;
/** Range of the widths gate 5 may ask the island to measure at. */
export const MIN_MEASURE_WIDTH = 120;
export const MAX_MEASURE_WIDTH = 4000;

const BlockId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
/** Theme variables: `--name` → a CSS value without `;`, braces or `<`. */
const Vars = z.record(z.string().regex(/^--[a-z0-9-]{1,64}$/), z.string().max(400).regex(/^[^;{}<>]*$/)).refine((vars) => Object.keys(vars).length <= 400);
const FontsHref = z.string().max(2000).startsWith("https://fonts.googleapis.com/").nullable();

/** App → island. */
export const ParentMessageSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("render"),
    v: z.literal(ISLAND_PROTOCOL_VERSION),
    blockId: BlockId,
    html: z.string().max(48 * 1024),
    css: z.string().max(512 * 1024),
    /** Page mode: the block is a section of a page (its own CSS and SVG pass the island's second wall). */
    page: z.boolean().optional(),
    /** Page mode: the screen's page stylesheet (sanitized again in the island). */
    pageCss: z.string().max(32 * 1024).optional(),
    vars: Vars,
    mode: z.enum(["light", "dark"]),
    fontsHref: FontsHref,
    /** Inline text edit and selection on (Ajustar); off on public links. */
    editable: z.boolean(),
    /** Locale for the island's own aria strings. */
    lang: z.enum(["es", "en"]),
  }),
  z.strictObject({ type: z.literal("theme"), v: z.literal(ISLAND_PROTOCOL_VERSION), vars: Vars, mode: z.enum(["light", "dark"]), fontsHref: FontsHref }),
  z.strictObject({
    type: z.literal("measure"),
    v: z.literal(ISLAND_PROTOCOL_VERSION),
    /**
     * Gate 5 (track D): the widths of the block's cell on each device (`DEVICE_WIDTHS`). The island lays the block
     * out at each one in turn (in the same task: nothing is painted), answers one `measure` per width, and restores
     * its own width. Without it, one `measure` at the current width.
     */
    widths: z.array(z.number().int().min(MIN_MEASURE_WIDTH).max(MAX_MEASURE_WIDTH)).max(3).optional(),
  }),
  /**
   * The keyboard way into the inline text edit (WCAG 2.1.1): edit text `t` (`data-dl-t`), or the block's first text
   * when null. Only in an editable island; Tab / Shift+Tab move to the next / previous text, Enter or Escape end.
   */
  z.strictObject({ type: z.literal("edit"), v: z.literal(ISLAND_PROTOCOL_VERSION), t: z.number().int().min(0).max(1000).nullable() }),
]);

/** Island → app. */
export const IslandMessageSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("ready"), v: z.literal(ISLAND_PROTOCOL_VERSION) }),
  z.strictObject({ type: z.literal("size"), blockId: BlockId, height: z.number().min(0).max(MAX_ISLAND_HEIGHT) }),
  z.strictObject({ type: z.literal("select"), blockId: BlockId, t: z.number().int().min(0).max(1000).nullable(), text: z.string().max(200).nullable() }),
  z.strictObject({ type: z.literal("textEdit"), blockId: BlockId, t: z.number().int().min(0).max(1000), text: z.string().max(2000) }),
  z.strictObject({ type: z.literal("navigate"), blockId: BlockId, screenId: BlockId }),
  /** An inline edit started from the keyboard ended (Enter, Escape, Tab past the last text): focus goes back to the app. */
  z.strictObject({ type: z.literal("editEnd"), blockId: BlockId }),
  z.strictObject({
    type: z.literal("measure"),
    blockId: BlockId,
    width: z.number().min(0).max(10_000),
    overflowX: z.boolean(),
    /** Interactive targets under 24×24 px (WCAG 2.5.8). */
    smallTargets: z.number().int().min(0).max(1000),
    /** Elements whose text is clipped. */
    clipped: z.number().int().min(0).max(1000),
    /** Height of the block at `width` (gate 5 compares it with the layout's in app screens). */
    height: z.number().min(0).max(100_000).optional(),
  }),
  z.strictObject({ type: z.literal("error"), message: z.string().max(300) }),
]);

export type ParentMessage = z.output<typeof ParentMessageSchema>;
export type IslandMessage = z.output<typeof IslandMessageSchema>;
