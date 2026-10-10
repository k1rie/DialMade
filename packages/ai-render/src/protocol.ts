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
    html: z.string().max(24 * 1024),
    css: z.string().max(512 * 1024),
    vars: Vars,
    mode: z.enum(["light", "dark"]),
    fontsHref: FontsHref,
    /** Inline text edit and selection on (Ajustar); off on public links. */
    editable: z.boolean(),
    /** Locale for the island's own aria strings. */
    lang: z.enum(["es", "en"]),
  }),
  z.strictObject({ type: z.literal("theme"), v: z.literal(ISLAND_PROTOCOL_VERSION), vars: Vars, mode: z.enum(["light", "dark"]), fontsHref: FontsHref }),
  z.strictObject({ type: z.literal("measure"), v: z.literal(ISLAND_PROTOCOL_VERSION) }),
]);

/** Island → app. */
export const IslandMessageSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("ready"), v: z.literal(ISLAND_PROTOCOL_VERSION) }),
  z.strictObject({ type: z.literal("size"), blockId: BlockId, height: z.number().min(0).max(MAX_ISLAND_HEIGHT) }),
  z.strictObject({ type: z.literal("select"), blockId: BlockId, t: z.number().int().min(0).max(1000).nullable(), text: z.string().max(200).nullable() }),
  z.strictObject({ type: z.literal("textEdit"), blockId: BlockId, t: z.number().int().min(0).max(1000), text: z.string().max(2000) }),
  z.strictObject({ type: z.literal("navigate"), blockId: BlockId, screenId: BlockId }),
  z.strictObject({
    type: z.literal("measure"),
    blockId: BlockId,
    width: z.number().min(0).max(10_000),
    overflowX: z.boolean(),
    /** Interactive targets under 24×24 px (WCAG 2.5.8). */
    smallTargets: z.number().int().min(0).max(1000),
    /** Elements whose text is clipped. */
    clipped: z.number().int().min(0).max(1000),
  }),
  z.strictObject({ type: z.literal("error"), message: z.string().max(300) }),
]);

export type ParentMessage = z.output<typeof ParentMessageSchema>;
export type IslandMessage = z.output<typeof IslandMessageSchema>;
