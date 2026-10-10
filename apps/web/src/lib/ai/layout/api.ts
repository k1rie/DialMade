// Wire format of /api/ai/layout. Client-safe (no SDK, no env).
import { LIBRARY, MAX_HEIGHT_ROWS, MAX_ROW } from "@dialmade/layout";
import { z } from "zod";
import {
  LAYOUT_MAX_EXISTING,
  LAYOUT_VARIANTS,
  MAP_MAX_BLOCKS,
  MAP_MAX_NEIGHBORS,
  MAX_DESCRIPTION_LENGTH,
  MIN_DESCRIPTION_LENGTH,
} from "./constants";
import type { MapAnswer, ProposalAnswer } from "./schema";

const LOCALES = ["es", "en"] as const;
const KINDS = ["landing", "app"] as const;
const LIBRARY_TYPES = LIBRARY.map((def) => def.type) as [string, ...string[]];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** «Describe tu producto»: 2 or 3 variants of a whole structure (or of the screens to add, with `existing`). */
export const ProposeRequestBodySchema = z.strictObject({
  task: z.literal("propose"),
  description: z.string().min(MIN_DESCRIPTION_LENGTH).max(MAX_DESCRIPTION_LENGTH),
  locale: z.enum(LOCALES),
  /** «Web pública», «Pantallas de app» or «Elige tú». */
  kind: z.enum(["any", ...KINDS]),
  /** `doc.brief.productType` (a catalog id), as context. */
  productType: z.string().max(48).regex(SLUG).optional(),
  /** Names of the project's screens when adding screens to it. */
  existing: z
    .array(z.strictObject({ name: z.string().min(1).max(60), kind: z.enum(KINDS) }))
    .max(LAYOUT_MAX_EXISTING)
    .optional(),
  variants: z.literal(LAYOUT_VARIANTS).optional(),
});
export type ProposeRequestBody = z.infer<typeof ProposeRequestBodySchema>;

const RectSchema = z.strictObject({
  col: z.int().min(0).max(11),
  row: z.int().min(0).max(MAX_ROW),
  w: z.int().min(1).max(12),
  h: z.int().min(1).max(MAX_HEIGHT_ROWS),
});

/** «Sugerir con IA»: the free blocks to type, all in one request (one free use). */
export const MapRequestBodySchema = z.strictObject({
  task: z.literal("map"),
  locale: z.enum(LOCALES),
  blocks: z
    .array(
      z.strictObject({
        screen: z.string().min(1).max(60),
        screenKind: z.enum(KINDS),
        label: z.string().max(60),
        note: z.string().max(200).optional(),
        rect: RectSchema,
        neighbors: z.array(z.enum(LIBRARY_TYPES)).max(MAP_MAX_NEIGHBORS).optional(),
      }),
    )
    .min(1)
    .max(MAP_MAX_BLOCKS),
});
export type MapRequestBody = z.infer<typeof MapRequestBodySchema>;

export const LayoutRequestBodySchema = z.discriminatedUnion("task", [ProposeRequestBodySchema, MapRequestBodySchema]);
export type LayoutRequestBody = z.infer<typeof LayoutRequestBodySchema>;

export type LayoutApiUsage = { inputTokens: number; outputTokens: number; model: string };

/** The validated, bounded answer of the task (`parseProposalAnswer` / `parseMapAnswer`); the client normalizes it. */
export type LayoutAnswer = { task: "propose"; answer: ProposalAnswer } | { task: "map"; answer: MapAnswer };

export type LayoutApiSuccess = LayoutAnswer & {
  usage: LayoutApiUsage;
  /** Entries of the answer past the limits (cut). */
  dropped: number;
  costUsd: number;
  remainingBudgetUsd: number | null;
  freeUsesRemaining?: number;
  freeUsesTotal?: number;
};
