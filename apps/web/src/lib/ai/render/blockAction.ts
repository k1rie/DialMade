// «Otra versión» and «Pedir cambio» of ONE AI block (spec §5.4, §8.2): build the request from the DesignDoc, send it
// through a transport, run the raw answer through the same sanitizer and gates as a generated block (in the worker)
// and return the new `AiBlock`. The caller writes it with `setAiBlockOps` as ONE patch: one undo step.
//
// The transport is an interface: the free tier (POST /api/ai/render/block with the live session) is here; BYOK and
// «Copiar prompt para mi Claude» come with track C's `transport.ts` and plug in as other `BlockActionTransport`s.
import { AI_RENDER_PROMPT_VERSION, brandInput, newSeed, screenInput, themeColorsFromVars, type BlockContext, type ProcessedBlock, type ThemeColors } from "@dialmade/ai-render";
import { MAX_AI_REQUEST_LENGTH, compileThemeVars, type AiBlock, type AiRenderPath, type DesignDoc } from "@dialmade/doc";
import { AI_SESSION_SCREENS } from "../config";
import {
  RENDER_BLOCK_ENDPOINT,
  RENDER_SESSION_ENDPOINT,
  type RenderBlockBody,
  type RenderBlockSuccess,
  type RenderErrorCode,
  type RenderSessionCounters,
  type RenderSessionSuccess,
  type RenderUsage,
} from "./api";
import { RenderTransportError, type RenderTransport as AccessTransport } from "./transport";
import { aiBlockInputs, aiBlockOf, aiDraftOf, currentBasis } from "./edit";

/** What the user asked for: a new take with the same direction, or a change (≤ 500 characters, data for the model). */
export type BlockActionRequest = { kind: "reroll" } | { kind: "change"; request: string; target?: { text: string } };

/** Codes a block action fails with: the wire's, plus the client's own. */
export type BlockActionErrorCode = RenderErrorCode | "no-ai-block" | "no-direction" | "gates-failed" | "no-session";

export class BlockActionError extends Error {
  readonly code: BlockActionErrorCode;
  /** The session's counters when the server sent them (a failed action gives its slot back). */
  readonly session: RenderSessionCounters | undefined;
  constructor(code: BlockActionErrorCode, message: string, session?: RenderSessionCounters) {
    super(message);
    this.name = "BlockActionError";
    this.code = code;
    this.session = session;
  }
}

/** What a block action answers: «mi Claude» has no usage, BYOK and manual no session counters. */
export type BlockActionAnswer = { html: string | null; usage: RenderUsage | null; session: RenderSessionCounters | null };

/** One path to Claude for block actions (spec §5.3): Track C's transports through `blockTransportFrom`. */
export type BlockActionTransport = {
  path: AiRenderPath;
  /** The free tier spends a session's action: `run` needs `body.sessionId` of a live session. */
  usesSession: boolean;
  /** Model of the provenance when the answer has no usage. */
  model?: string;
  run: (body: RenderBlockBody, signal?: AbortSignal) => Promise<BlockActionAnswer>;
};

/** Track C's transport (free tier, BYOK or «mi Claude») as a block-action transport: its errors as `BlockActionError`. */
export function blockTransportFrom(access: AccessTransport): BlockActionTransport {
  return {
    path: access.path,
    usesSession: access.path === "free",
    model: access.model,
    run: async (body, signal) => {
      try {
        return await access.block(body, signal ? { signal } : {});
      } catch (error) {
        if (error instanceof RenderTransportError) throw new BlockActionError(error.code, error.message, error.body.session);
        if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw new BlockActionError("aborted", "Aborted");
        throw new BlockActionError("network", error instanceof Error ? error.message : "Network error");
      }
    },
  };
}

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      ...(signal && { signal }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new BlockActionError("aborted", "Aborted");
    throw new BlockActionError("network", error instanceof Error ? error.message : "Network error");
  }
  const json = (await response.json().catch(() => null)) as (T & { code?: string; message?: string; session?: RenderSessionCounters }) | null;
  if (!response.ok || json === null) {
    throw new BlockActionError((json?.code as RenderErrorCode | undefined) ?? "upstream-error", json?.message ?? `HTTP ${response.status}`, json?.session);
  }
  return json;
}

/** Free tier: one action of the live design session (POST /api/ai/render/block). */
export const freeTierBlockTransport: BlockActionTransport = {
  path: "free",
  usesSession: true,
  run: (body, signal) => postJson<RenderBlockSuccess>(RENDER_BLOCK_ENDPOINT, body, signal),
};

/**
 * Opens a design session for block actions when none is alive (1 free use: up to 3 screens and 10 actions in 24 h).
 * The UI says so before calling. `screens` is the session's screen allowance, not screens designed now.
 */
export const openFreeSession = (signal?: AbortSignal): Promise<RenderSessionSuccess> =>
  postJson<RenderSessionSuccess>(RENDER_SESSION_ENDPOINT, { screens: AI_SESSION_SCREENS }, signal);

/** The theme colors of both modes, for the contrast gate (spec §7, gate 4). */
export const docThemeColors = (doc: DesignDoc): ThemeColors => ({
  light: themeColorsFromVars(compileThemeVars(doc, { mode: "light" })),
  dark: themeColorsFromVars(compileThemeVars(doc, { mode: "dark" })),
});

/** The request body of a block action (everything the user wrote travels as data). */
export function blockActionBody(doc: DesignDoc, screenId: string, blockId: string, request: BlockActionRequest, options: { sessionId: string; seed: number }): RenderBlockBody {
  const block = aiBlockOf(doc, screenId, blockId);
  if (!block) throw new BlockActionError("no-ai-block", "The block has no AI design");
  const direction = doc.aiRender?.direction;
  if (!direction) throw new BlockActionError("no-direction", "The document has no art direction");
  const screen = doc.screens[screenId]!;
  const input = aiBlockInputs(doc, screenId, new Set([blockId])).get(blockId);
  if (!input) throw new BlockActionError("no-ai-block", "The block is not on the screen");
  const { id, name, kind, route, locale, screens } = screenInput(doc, screenId, { draftOf: aiDraftOf(screen), only: new Set([blockId]) });
  const brand = brandInput(doc);
  // A container's surface travels as its root, so the model sees what it has.
  const html = block.html || `<div data-block-id="${blockId}" class="${["@container", ...(block.surfaceClasses ?? [])].join(" ")}"></div>`;
  return {
    sessionId: options.sessionId,
    brand: { ...brand, ...(brand.description && { description: brand.description.slice(0, 500) }) },
    direction: { axes: direction.axes, moves: direction.moves, rationale: direction.rationale },
    screen: { id, name, kind, route, locale, screens },
    block: input,
    html,
    action:
      request.kind === "reroll"
        ? { kind: "reroll", seed: options.seed }
        : {
            kind: "change",
            request: request.request.trim().slice(0, MAX_AI_REQUEST_LENGTH),
            ...(request.target?.text && { target: { text: request.target.text.slice(0, 200) } }),
          },
  };
}

export type BlockActionDeps = {
  transport: BlockActionTransport;
  /** The live session's id (free tier). */
  sessionId: string | null;
  /** Sanitize + gates (the worker: `processBlockOffThread`). */
  process: (raw: string, context: BlockContext) => Promise<ProcessedBlock>;
  signal?: AbortSignal;
  now?: () => Date;
};

export type BlockActionResult = { block: AiBlock; session: RenderSessionCounters | null; costUsd: number };

/**
 * Runs one block action against `doc` and returns the new version of the block (never written here). The answer
 * passes the same gates as a generated block; when it fails them, the block stays as it was (`gates-failed`).
 */
export async function runBlockAction(doc: DesignDoc, screenId: string, blockId: string, request: BlockActionRequest, deps: BlockActionDeps): Promise<BlockActionResult> {
  const current = aiBlockOf(doc, screenId, blockId);
  if (!current) throw new BlockActionError("no-ai-block", "The block has no AI design");
  if (deps.transport.usesSession && !deps.sessionId) throw new BlockActionError("no-session", "No live design session");
  const seed = request.kind === "reroll" ? newSeed() : current.provenance.seed;
  const body = blockActionBody(doc, screenId, blockId, request, { sessionId: deps.sessionId ?? crypto.randomUUID(), seed });
  const answer = await deps.transport.run(body, deps.signal);
  if (answer.html === null) throw new BlockActionError("invalid-response", "The answer had no block", answer.session ?? undefined);
  const processed = await deps.process(answer.html, { block: body.block, screenIds: doc.screenOrder, theme: docThemeColors(doc) });
  if (!processed.ok) throw new BlockActionError("gates-failed", processed.failure, answer.session ?? undefined);
  const direction = doc.aiRender!.direction!;
  const block: AiBlock = {
    html: processed.html,
    ...(processed.surfaceClasses && { surfaceClasses: processed.surfaceClasses }),
    active: true,
    basis: currentBasis(doc, body.block),
    gates: processed.gates,
    provenance: {
      kind: request.kind,
      path: deps.transport.path,
      model: (answer.usage?.model ?? deps.transport.model ?? "unknown").slice(0, 80),
      createdAt: (deps.now?.() ?? new Date()).toISOString(),
      ...(answer.usage && { costUsd: answer.usage.costUsd, inputTokens: answer.usage.inputTokens, outputTokens: answer.usage.outputTokens }),
      promptVersion: AI_RENDER_PROMPT_VERSION,
      directionId: direction.id,
      seed,
      ...(body.action.kind === "change" && { request: body.action.request }),
      recipeId: doc.brief.recipeId,
    },
  };
  return { block, session: answer.session, costUsd: answer.usage?.costUsd ?? 0 };
}
