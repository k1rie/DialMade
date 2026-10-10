// The layout AI's answers. One lenient Zod schema per task validates the hosted answer, the BYOK answer and the
// JSON pasted back from «mi Claude»; a strict twin (enums for block types and recipes) is compiled to the JSON
// Schema sent as structured output, so the hosted and BYOK paths can only name library blocks. Everything is
// bounded here (arrays sliced, strings cut) before `normalize.ts` turns it into layouts. Client-safe.
import { productChips, styleRecipes } from "@dialmade/catalog";
import { z } from "zod";
import {
  LAYOUT_MAX_BLOCKS,
  LAYOUT_MAX_SCREENS,
  LAYOUT_MAX_VARIANTS,
  MAP_BLOCK_TYPES,
  MAP_MAX_BLOCKS,
  PROPOSAL_BLOCK_TYPES,
} from "./constants";

export const LAYOUT_NAVS = ["sidebar", "rail", "topnav", "none"] as const;
export const LAYOUT_SCREEN_KINDS = ["landing", "app"] as const;
export const LAYOUT_RECIPE_IDS = styleRecipes.map((recipe) => recipe.id) as [string, ...string[]];
/** Product types the AI may infer: the chips of «Detalles» («generic» = «Otro»). */
export const LAYOUT_PRODUCT_TYPE_IDS = productChips.map((chip) => chip.id) as [string, ...string[]];

/* ---- Strict: compiled to the JSON Schema of the structured output ---- */

const StrictBlock = z.object({
  type: z.enum(PROPOSAL_BLOCK_TYPES),
  label: z.string().describe("Visible name of the box, in the request's language"),
  note: z.string().describe("What the box shows, one short line (empty when the label says it all)"),
  col: z.int().describe("First column, 0-11"),
  row: z.int().describe("First row of 8 px, from the top of the screen"),
  w: z.int().describe("Width in columns, 1-12"),
  h: z.int().describe("Height in rows of 8 px"),
  count: z.int().describe("Items of a repeatable block (cards, plans, KPIs…); 0 for the default"),
  linkTo: z.int().describe("Index of the screen of this variant its main action opens; -1 for none"),
});

const StrictScreen = z.object({
  name: z.string(),
  kind: z.enum(LAYOUT_SCREEN_KINDS),
  route: z.string().describe("/ or lowercase slug segments"),
  nav: z.enum(LAYOUT_NAVS).describe("Navigation frame of an app screen; none for landing screens"),
  blocks: z.array(StrictBlock),
});

const StrictVariant = z.object({
  name: z.string(),
  rationale: z.string().describe("One line: why this structure"),
  recipeId: z.enum(LAYOUT_RECIPE_IDS),
  recipeReason: z.string().describe("One line: why this style"),
  screens: z.array(StrictScreen),
});

/** «Detalles» inferred from the description (additive, v1.1): the user can correct them before choosing. */
const StrictDetails = z.object({
  brandName: z.string().describe("The product's name if the description gives one, else a short fictional name; never a real company"),
  tagline: z.string().describe("One short line that says what the product does, in the request's language"),
  productType: z.enum(LAYOUT_PRODUCT_TYPE_IDS).describe("The product type that fits best; generic when none does"),
});

export const StrictProposalAnswerSchema = z.object({ variants: z.array(StrictVariant), details: StrictDetails });

export const StrictMapAnswerSchema = z.object({
  blocks: z.array(z.object({ index: z.int().describe("index of the box in <free_blocks>"), type: z.enum(MAP_BLOCK_TYPES) })),
});

/** Every property required, `additionalProperties: false`, enums kept, and no numeric bounds (structured outputs reject them). */
function toStructuredOutputSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { io: "output" }) as Record<string, unknown>;
  delete json.$schema;
  const strip = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(strip);
    const record = node as Record<string, unknown>;
    if (record.type === "integer" || record.type === "number") {
      delete record.minimum;
      delete record.maximum;
    }
    Object.values(record).forEach(strip);
  };
  strip(json);
  return json;
}

export const PROPOSAL_JSON_SCHEMA = toStructuredOutputSchema(StrictProposalAnswerSchema);
export const MAP_JSON_SCHEMA = toStructuredOutputSchema(StrictMapAnswerSchema);

/** `output_config.format` of each task (same object on every request, so the compiled grammar is reused). */
export const proposalFormat = { type: "json_schema" as const, schema: PROPOSAL_JSON_SCHEMA };
export const mapFormat = { type: "json_schema" as const, schema: MAP_JSON_SCHEMA };

/* ---- Lenient: what every path parses (a pasted answer may miss optional fields or name unknown types) ---- */

/** Text fields are cut far above what the UI keeps; `normalize.ts` sanitizes them again. */
const Text = z.string().max(2000).catch("");
const Num = z.number().catch(Number.NaN);

const BlockSchema = z.object({
  /** Any string: unknown types are mapped or dropped by `normalize.ts`, never rendered as they are. */
  type: z.string().max(60),
  label: Text.default(""),
  note: Text.default(""),
  col: Num.default(Number.NaN),
  row: Num.default(Number.NaN),
  w: Num.default(Number.NaN),
  h: Num.default(Number.NaN),
  count: Num.default(0),
  linkTo: Num.default(-1),
});

const ScreenSchema = z.object({
  name: Text.default(""),
  kind: z.enum(LAYOUT_SCREEN_KINDS).catch("app"),
  route: Text.default(""),
  nav: z.enum(LAYOUT_NAVS).catch("sidebar"),
  blocks: z.array(BlockSchema),
});

const VariantSchema = z.object({
  name: Text.default(""),
  rationale: Text.default(""),
  recipeId: Text.default(""),
  recipeReason: Text.default(""),
  screens: z.array(ScreenSchema),
});

/** Optional: answers recorded before v1.1 «Detalles», or pasted without it, still validate. */
const DetailsSchema = z.object({ brandName: Text.default(""), tagline: Text.default(""), productType: Text.default("") });

export const ProposalAnswerSchema = z.object({ variants: z.array(VariantSchema), details: DetailsSchema.optional().catch(undefined) });
export const MapAnswerSchema = z.object({ blocks: z.array(z.object({ index: Num, type: z.string().max(60) })) });

export type ProposalBlockAnswer = z.output<typeof BlockSchema>;
export type ProposalScreenAnswer = z.output<typeof ScreenSchema>;
export type ProposalVariantAnswer = z.output<typeof VariantSchema>;
export type ProposalAnswer = z.output<typeof ProposalAnswerSchema>;
export type ProposalDetailsAnswer = z.output<typeof DetailsSchema>;
export type MapAnswer = z.output<typeof MapAnswerSchema>;

export type LayoutAnswerProblem = "invalid-schema" | "no-result";
export type ParsedAnswer<T> = { ok: true; answer: T; dropped: number } | { ok: false; problem: LayoutAnswerProblem; detail?: string };

const issueDetail = (error: z.ZodError) => {
  const issue = error.issues[0];
  return issue ? `${issue.path.join(".") || "(root)"}: ${issue.message}` : undefined;
};

/**
 * Validates a proposal answer and bounds it: at most `LAYOUT_MAX_VARIANTS` variants, `LAYOUT_MAX_SCREENS` screens
 * per variant and `LAYOUT_MAX_BLOCKS` blocks per screen (what is cut counts in `dropped`). `no-result` when no
 * variant keeps a screen with a block.
 */
export function parseProposalAnswer(raw: unknown): ParsedAnswer<ProposalAnswer> {
  const parsed = ProposalAnswerSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = issueDetail(parsed.error);
    return { ok: false, problem: "invalid-schema", ...(detail && { detail }) };
  }
  let dropped = Math.max(0, parsed.data.variants.length - LAYOUT_MAX_VARIANTS);
  const variants = parsed.data.variants.slice(0, LAYOUT_MAX_VARIANTS).flatMap((variant) => {
    dropped += Math.max(0, variant.screens.length - LAYOUT_MAX_SCREENS);
    const screens = variant.screens.slice(0, LAYOUT_MAX_SCREENS).map((screen) => {
      dropped += Math.max(0, screen.blocks.length - LAYOUT_MAX_BLOCKS);
      return { ...screen, blocks: screen.blocks.slice(0, LAYOUT_MAX_BLOCKS) };
    });
    if (!screens.some((screen) => screen.blocks.length > 0)) {
      dropped++;
      return [];
    }
    return [{ ...variant, screens }];
  });
  if (variants.length === 0) return { ok: false, problem: "no-result" };
  const { details } = parsed.data;
  return { ok: true, answer: { variants, ...(details && { details }) }, dropped };
}

/** Validates a map answer: at most `MAP_MAX_BLOCKS` entries. `no-result` when it has none. */
export function parseMapAnswer(raw: unknown): ParsedAnswer<MapAnswer> {
  const parsed = MapAnswerSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = issueDetail(parsed.error);
    return { ok: false, problem: "invalid-schema", ...(detail && { detail }) };
  }
  const blocks = parsed.data.blocks.slice(0, MAP_MAX_BLOCKS);
  if (blocks.length === 0) return { ok: false, problem: "no-result" };
  return { ok: true, answer: { blocks }, dropped: parsed.data.blocks.length - blocks.length };
}
