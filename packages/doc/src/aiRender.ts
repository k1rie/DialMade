// «Diseño con IA» in the DesignDoc (spec docs/design/diseno-con-ia-spec.md §8.3): additive and optional, so the
// document stays v2. The deterministic page stays underneath, untouched: an AI block only says how a layout block
// LOOKS (sanitized HTML of @dialmade/ai-render), never where it is. `active: false` = «Usar diseño base» (the HTML is
// kept for «Usar IA otra vez»).
import { z } from "zod";
import { utf8ByteLength } from "./utf8";

const ELEMENT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/** Axes of the art direction (spec §4.1). The code draws the candidates with a seed; the model picks among them. */
export const AI_AXES = {
  composition: ["editorial", "asymmetric", "centered-stage", "bento", "split", "data-dense"],
  typeVoice: ["quiet", "bold-display", "technical-mono", "humanist", "condensed-caps"],
  decoration: ["none", "rules-and-grids", "soft-shapes", "outlined", "tinted-panels", "gradient-wash"],
  imagery: ["framed-screens", "tilted-cards", "layered-collage", "icon-led", "data-viz-led"],
  colorStrategy: ["brand-forward", "neutral-with-pops", "high-contrast-cta", "tonal-monochrome"],
  rhythm: ["airy", "balanced", "compact"],
} as const;
export type AiAxis = keyof typeof AI_AXES;
export const AI_AXIS_NAMES = Object.keys(AI_AXES) as AiAxis[];
export type AiAxes = { [K in AiAxis]: (typeof AI_AXES)[K][number] };

/** «Dirección de arte» chips (spec §4.2, user decision 4): optional; `auto` leaves every axis to the seed. */
export const AI_DIRECTION_CHIPS = ["auto", "editorial", "technical", "warm", "playful", "luxury"] as const;
export type AiDirectionChip = (typeof AI_DIRECTION_CHIPS)[number];

export const AI_RENDER_PATHS = ["free", "byok", "manual"] as const;
export const AI_RENDER_KINDS = ["direction", "generate", "reroll", "change"] as const;

/** Warnings of the quality gates (spec §7), as codes: the UI words them in its own language. */
export const AI_GATE_CODES = [
  "contrast",
  "contrast-fixed",
  "overflow",
  "small-target",
  "heading-fixed",
  "new-contact",
  "classes-dropped",
  "unknown-icon",
  "off-direction",
  // Track D: a focus indicator removed and not replaced, or one that does not show (gate 4); letters outside the
  // language's writing system (gate 9, spec §15.1).
  "focus-ring",
  "foreign-script",
] as const;

/** Spec §2.1: 16 KB of sanitized HTML per block. */
export const MAX_AI_BLOCK_BYTES = 16 * 1024;
/** Spec §8.3: 1 MB of `aiRender` in the whole document. */
export const MAX_AI_RENDER_BYTES = 1024 * 1024;
export const MAX_AI_REQUEST_LENGTH = 500;
/**
 * AI blocks of removed layout blocks kept per screen (spec §8.3: «el stash lo trae de vuelta, como las props»):
 * a Layout undo that brings the block back brings its AI design back too. Oldest first out.
 */
export const MAX_AI_STASHED_BLOCKS = 12;

const Text = (max: number) => z.string().max(max);

export const AiProvenanceSchema = z.strictObject({
  kind: z.enum(AI_RENDER_KINDS),
  path: z.enum(AI_RENDER_PATHS),
  /** Model that wrote it (`claude.ai` for «mi Claude»). */
  model: Text(80).optional(),
  createdAt: z.iso.datetime(),
  costUsd: z.number().min(0).max(100).optional(),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  promptVersion: Text(40),
  directionId: Text(64).optional(),
  seed: z.number().int().min(0).max(0xffffffff),
  /** «Pedir cambio»: what the user asked (data, never instructions). */
  request: Text(MAX_AI_REQUEST_LENGTH).optional(),
  /**
   * Style recipe (`brief.recipeId`) the block was designed with. When the document's recipe changes, the tokens
   * still repaint the block, but its composition is the old style's: the UI offers «El estilo cambió · ¿Rehacer con
   * IA?» (spec §8.1), never automatically. Absent on blocks made before it existed (no notice for them).
   */
  recipeId: Text(48).optional(),
});

const AxesSchema = z.strictObject({
  composition: z.enum(AI_AXES.composition),
  typeVoice: z.enum(AI_AXES.typeVoice),
  decoration: z.enum(AI_AXES.decoration),
  imagery: z.enum(AI_AXES.imagery),
  colorStrategy: z.enum(AI_AXES.colorStrategy),
  rhythm: z.enum(AI_AXES.rhythm),
});

export const AiDirectionSchema = z.strictObject({
  id: z.string().regex(ELEMENT_ID),
  version: z.literal(1),
  seed: z.number().int().min(0).max(0xffffffff),
  chip: z.enum(AI_DIRECTION_CHIPS),
  axes: AxesSchema,
  /** 2–3 concrete design moves (spec §4.2), from the code's catalog. */
  moves: z.array(Text(160)).min(1).max(3),
  /** Why, in one or two sentences: shown in the UI and written to DESIGN.md. */
  rationale: Text(280),
  provenance: AiProvenanceSchema,
});

export const AiGateWarningSchema = z.strictObject({
  code: z.enum(AI_GATE_CODES),
  /** Short detail: the ratio and the text («3.1:1 · Ver demo»), the device, the contact… */
  detail: Text(160).optional(),
});

export const AiBlockSchema = z.strictObject({
  /** Sanitized, canonical HTML (one root with `data-block-id`), or "" for a container's `surfaceClasses`. */
  html: z.string().refine((html) => utf8ByteLength(html) <= MAX_AI_BLOCK_BYTES, `At most ${MAX_AI_BLOCK_BYTES} bytes of HTML`),
  /** Containers (spec §1 [C15]): only the classes of their surface. */
  surfaceClasses: z.array(Text(64)).max(40).optional(),
  active: z.boolean(),
  /** Hash of what the block was made from (type, label, note, count, size, copy, language, direction). */
  basis: Text(64),
  gates: z.strictObject({
    contrast: z.enum(["ok", "fixed", "warn"]),
    responsive: z.enum(["ok", "warn"]),
    /** Class tokens, attributes and tags the sanitizer dropped. */
    dropped: z.number().int().min(0),
    warnings: z.array(AiGateWarningSchema).max(16),
  }),
  provenance: AiProvenanceSchema,
});

export const AiScreenRenderSchema = z.strictObject({
  version: z.literal(1),
  blocks: z.record(z.string().regex(ELEMENT_ID), AiBlockSchema),
  /**
   * AI blocks of layout blocks a «Generar» removed, by their id (at most `MAX_AI_STASHED_BLOCKS`, oldest first):
   * when the block comes back (a Layout undo), its AI block comes back with it. Never rendered.
   */
  stash: z
    .record(z.string().regex(ELEMENT_ID), AiBlockSchema)
    .refine((stash) => Object.keys(stash).length <= MAX_AI_STASHED_BLOCKS, `At most ${MAX_AI_STASHED_BLOCKS} stashed AI blocks`)
    .optional(),
});

export const DocAiRenderSchema = z.strictObject({
  version: z.literal(1),
  direction: AiDirectionSchema.optional(),
});

export type AiProvenance = z.output<typeof AiProvenanceSchema>;
export type AiDirection = z.output<typeof AiDirectionSchema>;
export type AiGateWarning = z.output<typeof AiGateWarningSchema>;
export type AiGateCode = (typeof AI_GATE_CODES)[number];
export type AiBlock = z.output<typeof AiBlockSchema>;
export type AiScreenRender = z.output<typeof AiScreenRenderSchema>;
export type DocAiRender = z.output<typeof DocAiRenderSchema>;
export type AiRenderPath = (typeof AI_RENDER_PATHS)[number];
export type AiRenderKind = (typeof AI_RENDER_KINDS)[number];

/**
 * UTF-8 bytes of the `aiRender` members of a stored document: top level, every screen and every stashed screen
 * (`screenStash`), so the 1 MB cap holds for all the AI HTML the document carries, wherever it sits.
 */
export function aiRenderBytes(input: { aiRender?: unknown; screens?: unknown; screenStash?: unknown }): number {
  let bytes = input.aiRender === undefined ? 0 : utf8ByteLength(JSON.stringify(input.aiRender));
  for (const record of [input.screens, input.screenStash]) {
    if (!record || typeof record !== "object") continue;
    for (const screen of Object.values(record as Record<string, unknown>)) {
      const render = screen && typeof screen === "object" ? (screen as { aiRender?: unknown }).aiRender : undefined;
      if (render !== undefined) bytes += utf8ByteLength(JSON.stringify(render));
    }
  }
  return bytes;
}
