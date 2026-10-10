// figma-plan v1: everything the Dialmade plugin needs to rebuild a design in Figma (variables, styles, pages and
// auto layout frames), as plain JSON. Values are already resolved (the plugin never computes a theme), and every
// themable value also names the variable or style it comes from, so the plugin binds it. Only depends on Zod:
// the plugin bundles this file to validate what the user pastes.
import { z } from "zod";

export const FIGMA_PLAN_FORMAT = "dialmade-figma-plan";
export const FIGMA_PLAN_VERSION = 1;

const unit = z.number().min(0).max(1);
export const RgbaSchema = z.strictObject({ r: unit, g: unit, b: unit, a: unit });
export type Rgba = z.infer<typeof RgbaSchema>;

/** A solid color; `variable` is the name of a variable of the color collection bound to it. */
export const SolidPaintSchema = z.strictObject({
  type: z.literal("SOLID"),
  color: RgbaSchema,
  /** 0–1 on top of the color's own alpha (Figma's paint opacity). */
  opacity: unit.optional(),
  variable: z.string().optional(),
});

export const GradientPaintSchema = z.strictObject({
  type: z.literal("GRADIENT_LINEAR"),
  /** CSS angle in degrees. */
  angle: z.number(),
  stops: z.array(z.strictObject({ position: unit, color: RgbaSchema, variable: z.string().optional() })).min(2),
});

export const PaintSchema = z.discriminatedUnion("type", [SolidPaintSchema, GradientPaintSchema]);
export type PlanPaint = z.infer<typeof PaintSchema>;

export const VariableValueSchema = z.union([RgbaSchema, z.number(), z.strictObject({ alias: z.string() })]);

export const VariableSchema = z.strictObject({
  /** `color/primary`, `radius/md`, `space/5`. */
  name: z.string().min(1),
  type: z.enum(["COLOR", "FLOAT"]),
  /** Figma `VariableScope`s. */
  scopes: z.array(z.string()),
  /** The CSS variable it mirrors (`--primary`): set as the variable's code syntax for Web. */
  cssVar: z.string(),
  /** Mode name → value. An alias names another variable of the same collection. */
  values: z.record(z.string(), VariableValueSchema),
});
export type PlanVariable = z.infer<typeof VariableSchema>;

export const CollectionSchema = z.strictObject({
  name: z.string().min(1),
  /** The first mode is the default one. */
  modes: z.array(z.string().min(1)).min(1),
  variables: z.array(VariableSchema),
});
export type PlanCollection = z.infer<typeof CollectionSchema>;

export const TextStyleSchema = z.strictObject({
  id: z.string(),
  /** `Dialmade/H1`. */
  name: z.string(),
  fontFamily: z.string(),
  /** Used when `fontFamily` is not available in the file: the plugin reports it and uses this one. */
  fallbackFamily: z.string(),
  fontWeight: z.number().int().min(1).max(1000),
  fontSize: z.number().positive(),
  /** Percent of the font size (`115` = 1.15). */
  lineHeight: z.number().positive(),
  /** Percent of the font size (`-2` = -0.02em). */
  letterSpacing: z.number(),
  textCase: z.enum(["ORIGINAL", "UPPER"]),
  /** Name of the FLOAT variable bound to the font size (`font-size/h1`), when there is one. */
  fontSizeVariable: z.string().optional(),
});
export type PlanTextStyle = z.infer<typeof TextStyleSchema>;

export const EffectSchema = z.strictObject({
  type: z.literal("DROP_SHADOW"),
  color: RgbaSchema,
  offset: z.strictObject({ x: z.number(), y: z.number() }),
  radius: z.number().min(0),
  spread: z.number(),
});

export const EffectStyleSchema = z.strictObject({ id: z.string(), name: z.string(), effects: z.array(EffectSchema) });
export type PlanEffectStyle = z.infer<typeof EffectStyleSchema>;

const Sizing = z.enum(["FIXED", "HUG", "FILL"]);

export const SizingSchema = z.strictObject({
  horizontal: Sizing,
  vertical: Sizing,
  /** Width in px: exact when FIXED, the expected width otherwise. */
  width: z.number().min(0),
  /** Height in px when FIXED. */
  height: z.number().min(0).optional(),
  minHeight: z.number().min(0).optional(),
  maxWidth: z.number().min(0).optional(),
});

/** A number bound to a variable of the tokens collection (radius, spacing). */
export const BoundNumberSchema = z.strictObject({ value: z.number(), variable: z.string().optional() });

const nodeBase = {
  /** Unique in the plan and stable between exports of the same document. */
  id: z.string().min(1),
  name: z.string(),
  sizing: SizingSchema,
  opacity: unit.optional(),
  /** Out of its parent's auto layout, at these px of the parent. */
  absolute: z.strictObject({ x: z.number(), y: z.number() }).optional(),
};

export const FrameLayoutSchema = z.strictObject({
  mode: z.enum(["HORIZONTAL", "VERTICAL", "NONE"]),
  wrap: z.boolean(),
  itemSpacing: BoundNumberSchema,
  /** Between wrapped lines. */
  counterAxisSpacing: BoundNumberSchema.optional(),
  padding: z.strictObject({ top: BoundNumberSchema, right: BoundNumberSchema, bottom: BoundNumberSchema, left: BoundNumberSchema }),
  primaryAxisAlign: z.enum(["MIN", "CENTER", "MAX", "SPACE_BETWEEN"]),
  counterAxisAlign: z.enum(["MIN", "CENTER", "MAX", "BASELINE"]),
});

export const StrokeSchema = z.strictObject({
  paint: PaintSchema,
  weight: z.number().min(0),
  /** Default all sides. */
  sides: z.array(z.enum(["top", "right", "bottom", "left"])).optional(),
  dashed: z.boolean().optional(),
});

export type PlanText = {
  type: "TEXT";
  id: string;
  name: string;
  sizing: z.infer<typeof SizingSchema>;
  opacity?: number;
  absolute?: { x: number; y: number };
  characters: string;
  textStyle: string;
  fill: PlanPaint;
  textAlign: "LEFT" | "CENTER" | "RIGHT";
  strikethrough?: boolean;
  /** Overrides of the text style on this node. */
  fontSize?: number;
  fontWeight?: number;
};

export type PlanShape = {
  type: "RECTANGLE" | "ELLIPSE";
  id: string;
  name: string;
  sizing: z.infer<typeof SizingSchema>;
  opacity?: number;
  absolute?: { x: number; y: number };
  fills: PlanPaint[];
  stroke?: z.infer<typeof StrokeSchema>;
  cornerRadius?: z.infer<typeof BoundNumberSchema>;
  /** An image placeholder: the plugin names it so and keeps the gradient as its fill. */
  image?: boolean;
};

export type PlanIcon = {
  type: "ICON";
  id: string;
  name: string;
  sizing: z.infer<typeof SizingSchema>;
  opacity?: number;
  absolute?: { x: number; y: number };
  /** A 24×24 SVG with `stroke="currentColor"`: the plugin swaps in `color` and binds its variable. */
  svg: string;
  color: PlanPaint;
};

export type PlanFrame = {
  type: "FRAME";
  id: string;
  name: string;
  sizing: z.infer<typeof SizingSchema>;
  opacity?: number;
  absolute?: { x: number; y: number };
  layout: z.infer<typeof FrameLayoutSchema>;
  fills: PlanPaint[];
  stroke?: z.infer<typeof StrokeSchema>;
  cornerRadius?: z.infer<typeof BoundNumberSchema>;
  /** Id of an effect style of the plan. */
  effectStyle?: string;
  clipsContent: boolean;
  /** Id of a top-level frame of the plan this frame opens on click (prototype). */
  navigateTo?: string;
  /** Element id of the page (`hero-1`, a block id): the plugin keeps it as plugin data. */
  key?: string;
  /** Explicit mode of the color collection for this frame (`Dark` inside a light page). */
  mode?: string;
  children: PlanNode[];
};

export type PlanNode = PlanFrame | PlanText | PlanShape | PlanIcon;

export const TextNodeSchema: z.ZodType<PlanText> = z.strictObject({
  type: z.literal("TEXT"),
  ...nodeBase,
  characters: z.string(),
  textStyle: z.string(),
  fill: PaintSchema,
  textAlign: z.enum(["LEFT", "CENTER", "RIGHT"]),
  strikethrough: z.boolean().optional(),
  fontSize: z.number().positive().optional(),
  fontWeight: z.number().int().min(1).max(1000).optional(),
});

export const ShapeNodeSchema: z.ZodType<PlanShape> = z.strictObject({
  type: z.enum(["RECTANGLE", "ELLIPSE"]),
  ...nodeBase,
  fills: z.array(PaintSchema),
  stroke: StrokeSchema.optional(),
  cornerRadius: BoundNumberSchema.optional(),
  image: z.boolean().optional(),
});

export const IconNodeSchema: z.ZodType<PlanIcon> = z.strictObject({
  type: z.literal("ICON"),
  ...nodeBase,
  svg: z.string().startsWith("<svg"),
  color: PaintSchema,
});

export const FrameNodeSchema: z.ZodType<PlanFrame> = z.strictObject({
  type: z.literal("FRAME"),
  ...nodeBase,
  layout: FrameLayoutSchema,
  fills: z.array(PaintSchema),
  stroke: StrokeSchema.optional(),
  cornerRadius: BoundNumberSchema.optional(),
  effectStyle: z.string().optional(),
  clipsContent: z.boolean(),
  navigateTo: z.string().optional(),
  key: z.string().optional(),
  mode: z.string().optional(),
  get children() {
    return z.array(NodeSchema);
  },
});

export const NodeSchema: z.ZodType<PlanNode> = z.lazy(() => z.union([FrameNodeSchema, TextNodeSchema, ShapeNodeSchema, IconNodeSchema]));

export const PlanPageSchema = z.strictObject({
  id: z.string().min(1),
  /** Figma page name. */
  name: z.string().min(1),
  kind: z.enum(["screen", "style-guide", "page"]),
  route: z.string().optional(),
  /** The page's top-level frame (desktop). */
  frame: FrameNodeSchema,
});
export type PlanPage = z.infer<typeof PlanPageSchema>;

export const FontSchema = z.strictObject({ family: z.string(), weights: z.array(z.number().int()) });

export const FigmaPlanSchema = z.strictObject({
  format: z.literal(FIGMA_PLAN_FORMAT),
  version: z.literal(FIGMA_PLAN_VERSION),
  /** Brand name: names the collections' prefix and the plugin's summary. */
  name: z.string(),
  locale: z.enum(["es", "en"]),
  /** Mode the frames show first (`setExplicitVariableModeForCollection`). */
  defaultMode: z.string(),
  collections: z.strictObject({ color: CollectionSchema, tokens: CollectionSchema }),
  textStyles: z.array(TextStyleSchema),
  effectStyles: z.array(EffectStyleSchema),
  /** Every font the text styles use, with their weights. */
  fonts: z.array(FontSchema),
  pages: z.array(PlanPageSchema).min(1),
});
export type FigmaPlan = z.infer<typeof FigmaPlanSchema>;

/** Parses a figma-plan (a string or a value). Throws a `ZodError` (or a `SyntaxError`) when it is not one. */
export function parseFigmaPlan(input: unknown): FigmaPlan {
  const value = typeof input === "string" ? (JSON.parse(input) as unknown) : input;
  return FigmaPlanSchema.parse(value);
}
