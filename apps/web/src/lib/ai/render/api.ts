// Wire format of «Diseño con IA» (/api/ai/render/*), shared by the route handlers and the client. Client-safe (no SDK,
// no env). Everything the user wrote (names, labels, notes, copy, the brief, a request) travels in these bodies as
// DATA: the prompt builder of @dialmade/ai-render escapes it, and the answer is only HTML that the client sanitizes.
import { AI_DIRECTION_CHIPS, AI_AXES, AI_RENDER_TIERS, MAX_AI_REQUEST_LENGTH, type AiRenderTier } from "@dialmade/doc";
import { z } from "zod";
import type { AiApiError, AiApiErrorCode } from "../api";
import { AI_SESSION_SCREENS } from "../config";
import { FULL_ACCESS_RENDER_MODELS, type FullAccessRenderModel } from "./fullAccessModel";

export const RENDER_SESSION_ENDPOINT = "/api/ai/render/session";
export const RENDER_ENDPOINT = "/api/ai/render";
export const RENDER_BLOCK_ENDPOINT = "/api/ai/render/block";

/** Body caps: a screen of up to 40 blocks with drafts fits easily. */
export const MAX_RENDER_BODY_BYTES = 128 * 1024;
export const MAX_RENDER_BLOCKS = 40;

const Id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
const Line = (max: number) => z.string().max(max);
const SessionId = z.string().uuid();

export const RenderBrandSchema = z.strictObject({
  name: Line(80),
  tagline: Line(160).optional(),
  productType: Line(120),
  description: Line(500).optional(),
  palette: z.strictObject({
    hue: z.number().min(0).max(360),
    chroma: z.enum(["neutral", "muted", "vivid"]),
    secondaryHue: z.number().min(0).max(360).optional(),
    preferredMode: z.enum(["light", "dark"]),
  }),
  recipe: z.strictObject({ id: Line(48), surface: Line(24), shape: Line(24), density: Line(24), mood: Line(240) }),
  fingerprint: z.record(Line(32), Line(64)).refine((value) => Object.keys(value).length <= 12).optional(),
});

export const RenderBlockSchema = z.strictObject({
  id: Id,
  type: Line(32),
  label: Line(80),
  note: Line(400).optional(),
  count: z.number().int().min(1).max(99).optional(),
  cols: z.number().int().min(1).max(12),
  heightPx: z.number().int().min(1).max(20_000),
  linksTo: Id.optional(),
  container: z.literal(true).optional(),
  h1: z.literal(true).optional(),
  draft: z.array(Line(200)).max(40),
});

export const RenderScreenSchema = z.strictObject({
  id: Id,
  name: Line(80),
  kind: z.enum(["landing", "app"]),
  route: Line(120),
  locale: z.enum(["es", "en"]),
  screens: z.array(z.strictObject({ id: Id, name: Line(80) })).max(24),
  blocks: z.array(RenderBlockSchema).min(1).max(MAX_RENDER_BLOCKS),
});

export const RenderDirectionSchema = z.strictObject({
  axes: z.strictObject({
    composition: z.enum(AI_AXES.composition),
    typeVoice: z.enum(AI_AXES.typeVoice),
    decoration: z.enum(AI_AXES.decoration),
    imagery: z.enum(AI_AXES.imagery),
    colorStrategy: z.enum(AI_AXES.colorStrategy),
    rhythm: z.enum(AI_AXES.rhythm),
  }),
  moves: z.array(Line(160)).min(1).max(3),
  rationale: Line(280),
});

/**
 * «Acceso completo» only (../fullAccess): the model and the finish of the call. A free-tier caller that sends them gets
 * 400; without them the call runs the free model at `mockup`.
 */
const FullAccessChoice = {
  model: z.enum(FULL_ACCESS_RENDER_MODELS).optional(),
  tier: z.enum(AI_RENDER_TIERS).optional(),
};
export type RenderChoice = { model?: FullAccessRenderModel | undefined; tier?: AiRenderTier | undefined };

/** POST /api/ai/render/session: one free use opens a design session. */
export const RenderSessionBodySchema = z.strictObject({
  /** Screens the «Generar con IA» will design (≤ 3; more screens = more sessions, the UI says so before calling). */
  screens: z.number().int().min(1).max(AI_SESSION_SCREENS),
  ...FullAccessChoice,
});
export type RenderSessionBody = z.infer<typeof RenderSessionBodySchema>;

/** POST /api/ai/render: the direction (JSON answer) or ONE screen (SSE stream of blocks). */
export const RenderRequestBodySchema = z.discriminatedUnion("task", [
  z.strictObject({
    task: z.literal("direction"),
    sessionId: SessionId,
    brand: RenderBrandSchema,
    locale: z.enum(["es", "en"]),
    /** The server draws the candidates itself from these (never trusts candidate lists from the client). */
    seed: z.number().int().min(0).max(0xffffffff),
    recipeId: Line(48),
    chip: z.enum(AI_DIRECTION_CHIPS),
    screens: z.array(z.strictObject({ name: Line(80), kind: z.enum(["landing", "app"]), blocks: z.array(Line(32)).max(MAX_RENDER_BLOCKS) })).max(AI_SESSION_SCREENS),
    ...FullAccessChoice,
  }),
  z.strictObject({
    task: z.literal("screen"),
    sessionId: SessionId,
    brand: RenderBrandSchema,
    direction: RenderDirectionSchema,
    screen: RenderScreenSchema,
    ...FullAccessChoice,
  }),
]);
export type RenderRequestBody = z.infer<typeof RenderRequestBodySchema>;

/** POST /api/ai/render/block: «Otra versión» or «Pedir cambio» of one block (one session action). */
export const RenderBlockBodySchema = z.strictObject({
  sessionId: SessionId,
  brand: RenderBrandSchema,
  direction: RenderDirectionSchema,
  screen: RenderScreenSchema.omit({ blocks: true }),
  block: RenderBlockSchema,
  /** Current sanitized HTML of the block. */
  html: z.string().max(16 * 1024),
  action: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("reroll"), seed: z.number().int().min(0).max(0xffffffff) }),
    z.strictObject({ kind: z.literal("change"), request: z.string().min(1).max(MAX_AI_REQUEST_LENGTH), target: z.strictObject({ text: Line(200) }).optional() }),
  ]),
  ...FullAccessChoice,
});
export type RenderBlockBody = z.infer<typeof RenderBlockBodySchema>;

export type RenderSessionCounters = {
  directionsUsed: number;
  directionsMax: number;
  screensUsed: number;
  screensMax: number;
  actionsUsed: number;
  actionsMax: number;
  expiresAt: string;
};

export type RenderUsage = { model: string; inputTokens: number; outputTokens: number; cacheReadTokens: number; costUsd: number };

export type RenderSessionSuccess = {
  sessionId: string;
  session: RenderSessionCounters;
  freeUsesRemaining: number;
  freeUsesTotal: number;
  remainingBudgetUsd: number;
};

export type RenderDirectionSuccess = {
  direction: z.infer<typeof RenderDirectionSchema>;
  usage: RenderUsage;
  session: RenderSessionCounters;
};

export type RenderBlockSuccess = {
  /** RAW html of the block's root (the client sanitizes it and runs the gates). `null` when no root came back. */
  html: string | null;
  usage: RenderUsage;
  session: RenderSessionCounters;
};

/** Error codes of the render routes: the shared AI ones plus the session's. */
export const RENDER_SESSION_ERROR_CODES = ["session-not-found", "session-expired", "session-exhausted"] as const;
export type RenderErrorCode = AiApiErrorCode | (typeof RENDER_SESSION_ERROR_CODES)[number];
export type RenderApiError = Omit<AiApiError, "code"> & { code: RenderErrorCode; session?: RenderSessionCounters };

/**
 * SSE events of a screen (`text/event-stream`, spec §5.3): `block` = the RAW html of one closed root (never trusted:
 * the client sanitizes it in a worker), `progress` = characters received, `usage` once at the end, `error`, `done`.
 */
export type RenderStreamEvent =
  | { type: "block"; blockId: string | null; html: string; forced: boolean }
  | { type: "progress"; received: number }
  | { type: "usage"; usage: RenderUsage }
  | { type: "error"; error: RenderApiError }
  | { type: "done"; session: RenderSessionCounters | null };

export function encodeSse(event: RenderStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/** Reads the SSE body of POST /api/ai/render (screen) as events. Malformed frames are skipped. */
export async function* readRenderStream(body: ReadableStream<Uint8Array>): AsyncGenerator<RenderStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let cut = buffer.indexOf("\n\n");
    while (cut >= 0) {
      const frame = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const data = frame.split("\n").find((line) => line.startsWith("data: "));
      if (data) {
        try {
          yield JSON.parse(data.slice(6)) as RenderStreamEvent;
        } catch {
          // skip
        }
      }
      cut = buffer.indexOf("\n\n");
    }
    if (done) return;
  }
}
