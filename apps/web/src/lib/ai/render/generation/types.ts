// «Generar con IA» (spec §5, tracks doc · Track A): the state of one generation, the transport it talks to and what
// the UI reads. Type-only module (client-safe, no React).
import type { AiDirectionChip, AiRenderPath, AiRenderTier } from "@dialmade/doc";
import type {
  RenderApiError,
  RenderBlockBody,
  RenderBlockSuccess,
  RenderDirectionSuccess,
  RenderErrorCode,
  RenderRequestBody,
  RenderSessionBody,
  RenderSessionCounters,
  RenderSessionSuccess,
  RenderStreamEvent,
  RenderUsage,
} from "../api";

export type TransportResult<T> = { ok: true; value: T } | { ok: false; error: RenderApiError };

export type DirectionBody = Extract<RenderRequestBody, { task: "direction" }>;
export type ScreenBody = Extract<RenderRequestBody, { task: "screen" }>;

/**
 * How the generation reaches Claude: the four calls of the render routes (session, direction, one screen as a
 * stream of raw blocks, one block action). The free tier (`createFreeTierTransport`) uses `fetch` on
 * /api/ai/render/*; Track C's transport (BYOK in the browser, «mi Claude») implements the same shape with the same
 * wire bodies of ../api, so the store never knows which path answered. A transport never throws: failures come back
 * as `RenderApiError` (codes of ../api), and an aborted stream ends with an `aborted` error event.
 */
export type RenderTransport = {
  readonly path: AiRenderPath;
  /** Model named in the provenance (Track C's transports know it; `claude.ai` for «mi Claude»). */
  readonly model?: string;
  /** «Maqueta · Presentable · Producto final» it asks with (written to the provenance; absent = `mockup`). */
  readonly tier?: AiRenderTier;
  /** `true` when «Cancelar» stops the call and its billing (BYOK); the free tier finishes and bills the screen. */
  readonly cancelStopsBilling?: boolean;
  openSession(body: RenderSessionBody, signal?: AbortSignal): Promise<TransportResult<OpenedSession>>;
  direction(body: DirectionBody, signal?: AbortSignal): Promise<TransportResult<DirectionAnswer>>;
  screen(body: ScreenBody, signal: AbortSignal): AsyncIterable<RenderStreamEvent>;
  block(body: RenderBlockBody, signal?: AbortSignal): Promise<TransportResult<BlockAnswer>>;
};

/** A session: the free tier's counters, or none (BYOK and «mi Claude» are not limited by Dialmade). */
export type OpenedSession = Pick<RenderSessionSuccess, "sessionId"> &
  Partial<Omit<RenderSessionSuccess, "sessionId" | "session">> & { session: RenderSessionCounters | null };
/** «mi Claude» has no usage (the user's own account paid). */
export type DirectionAnswer = Omit<RenderDirectionSuccess, "usage" | "session"> & { usage: RenderUsage | null; session: RenderSessionCounters | null };
export type BlockAnswer = Omit<RenderBlockSuccess, "usage" | "session"> & { usage: RenderUsage | null; session: RenderSessionCounters | null };

/** One block of a screen in this generation. */
export type BlockPhase =
  /** Asked for; its root has not closed yet. */
  | "waiting"
  /** Its root closed: sanitizing and gates in the worker. */
  | "processing"
  /** Written to the doc as an active AI block. */
  | "done"
  /** Missing, rejected by the gates, or its source failed (kit clone): it stays on the base design. */
  | "failed"
  /** The user cancelled before it arrived: base design, no badge. */
  | "cancelled";

/** Why a block stayed on the base design (the badge's detail). */
export type BlockFailure = "missing" | "gates" | "duplicate" | "source-failed" | "gone" | "request";

export type BlockRun = {
  phase: BlockPhase;
  failure?: BlockFailure;
  /** Warnings of the gates (contrast, headings…) once done. */
  warnings?: number;
  /** Kit piece cloned from this block (spec §4.3): it is not asked for on this screen. */
  cloneOf?: { screenId: string; blockId: string };
  /** A block retry («Reintentar» on its badge: one action of the session) is in flight. */
  retrying?: boolean;
};

export type ScreenPhase = "queued" | "streaming" | "done" | "failed" | "cancelled";

export type ScreenRun = {
  screenId: string;
  phase: ScreenPhase;
  /** Blocks of the screen in reading order (asked for, cloned, or both). */
  order: string[];
  blocks: Record<string, BlockRun>;
  /** The call failed (API error, refusal, no root at all): the server gave its slot back, so a retry is free. */
  error?: RenderErrorCode;
  costUsd?: number;
};

export type GenerationPhase =
  | "idle"
  /** Opening the design session (one free use). */
  | "session"
  /** «Eligiendo dirección de arte…». */
  | "direction"
  | "screens"
  | "done"
  | "cancelled"
  /** Nothing was generated (no session, or no screen could be asked for). */
  | "failed";

/** Polite announcement of a finished screen (spec §10.2 [C9]: one per screen, never per block). */
export type ScreenAnnouncement = { n: number; screenId: string; ai: number; base: number };

export type GenerationState = {
  /** Grows with every «Generar con IA». */
  runId: number;
  phase: GenerationPhase;
  screenOrder: string[];
  screens: Record<string, ScreenRun>;
  /** `counters` only in the free tier. */
  session: { id: string; counters: RenderSessionCounters | null } | null;
  /** The art direction of this run: the model's rationale, or the code's pick when the call failed. */
  direction: { rationale: string; fromModel: boolean; /** The variant of the recipe the direction picked (brief.themeId). */ themeId?: string } | null;
  /** What stopped the run before any screen (or the last error of a block action). */
  error: RenderErrorCode | null;
  announcement: ScreenAnnouncement | null;
  costUsd: number;
  /**
   * What «Cancelar» did once screens were asked for: the free tier's call `finishes` and bills the screen, BYOK's
   * `stops` (only what was generated is billed), «mi Claude» bills `none`. Null when nothing was cancelled, or the
   * cancel came before any screen was asked for.
   */
  cancel?: { billing: "finishes" | "stops" | "none" } | null;
};

/** What the «IA» control remembers for the next «Generar» (per document, survives Layout → Ajustar). */
export type GenerationPrefs = {
  /** The «IA» control of the Layout's bar: no AI, AI copy («Textos»), or «Diseño con IA». */
  mode: AiGenerateMode;
  chip: AiDirectionChip;
  /** Screens picked in AiScreensPicker; `null` = the default pick (`defaultScreenPick`). */
  screens: string[] | null;
  /** «Estilo»: the developer's words for the look (kept in the direction once used). */
  style: string;
  /** Reference screenshots for the next direction: in memory only, never written to the document or storage. */
  references: StyleReference[];
};

/** A reference screenshot, re-encoded in the browser (JPEG, long side ≤ 1280 px). */
export type StyleReference = { id: string; name: string; mediaType: "image/jpeg"; data: string };

export type AiGenerateMode = "off" | "copy" | "design";

export type GenerateRequest = {
  screenIds: readonly string[];
  chip: AiDirectionChip;
  style?: string;
  references?: readonly Pick<StyleReference, "mediaType" | "data">[];
};
