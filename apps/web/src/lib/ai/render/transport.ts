// The three ways into «Diseño con IA» (spec §5.2, §5.3, §5.6, §6.4) behind ONE interface, so the generation store
// (track A) and the block card (track B) run the same pipeline whatever pays for the call:
// - `free`: the hosted free tier, through /api/ai/render/{session,,block} (fetch + SSE);
// - `byok`: the user's own key, from the browser straight to api.anthropic.com (./byok, loaded on demand); the key is
//   read at call time and never leaves the tab towards Dialmade;
// - `manual`: «Copiar prompt para mi Claude», a pasted answer (./manual) replayed as the same events.
//
// Every path speaks the wire types of ./api: the request bodies of the routes, `RenderStreamEvent` for a screen and
// the RAW html of each root (never trusted: the caller sanitizes it in the worker and runs the gates). Client-safe:
// no SDK at the top level, no env.
import type { AiRenderPath, AiRenderTier } from "@dialmade/doc";
import { updateAiCounters } from "@/hooks/useAiStatus";
import { isAiApiErrorCode, type AiStatusResponse } from "../api";
import { OFFLINE_AI_STATUS, countersFrom, hostedBlocker, type AiFallbackReason } from "../policy";
import { DEFAULT_BYOK_RENDER_MODEL } from "./byokModel";
import { getFullAccessRenderModel } from "./fullAccessModelStore";
import { getRenderTier } from "./renderTier";
import {
  RENDER_BLOCK_ENDPOINT,
  RENDER_ENDPOINT,
  RENDER_SESSION_ENDPOINT,
  RENDER_SESSION_ERROR_CODES,
  readRenderStream,
  type RenderApiError,
  type RenderBlockBody,
  type RenderBlockSuccess,
  type RenderChoice,
  type RenderDirectionSchema,
  type RenderDirectionSuccess,
  type RenderErrorCode,
  type RenderRequestBody,
  type RenderSessionBody,
  type RenderSessionCounters,
  type RenderSessionSuccess,
  type RenderStreamEvent,
  type RenderUsage,
} from "./api";
import type { z } from "zod";

export type RenderDirectionAnswer = z.infer<typeof RenderDirectionSchema>;
export type DirectionBody = Omit<Extract<RenderRequestBody, { task: "direction" }>, "task">;
export type ScreenBody = Omit<Extract<RenderRequestBody, { task: "screen" }>, "task">;
export type BlockBody = RenderBlockBody;

/** What opening a session gives. BYOK and manual have no counters: nothing limits them (the user pays, or uses their Claude). */
export type TransportSession = {
  sessionId: string;
  session: RenderSessionCounters | null;
  /** Free tier only: this device's uses left this month after opening it. */
  freeUsesRemaining?: number;
  freeUsesTotal?: number;
  remainingBudgetUsd?: number;
};

export type TransportDirection = { direction: RenderDirectionAnswer; usage: RenderUsage | null; session: RenderSessionCounters | null };
export type TransportBlock = { html: string | null; usage: RenderUsage | null; session: RenderSessionCounters | null };
export type TransportCallOptions = { signal?: AbortSignal };

export interface RenderTransport {
  readonly path: AiRenderPath;
  /** Model written to the provenance before the answer says it (`claude.ai` for «mi Claude»). */
  readonly model: string;
  /** «Maqueta · Presentable · Producto final» it asks with (the free tier is always `mockup`). */
  readonly tier: AiRenderTier;
  /**
   * `true` when «Cancelar» stops the call and its billing (BYOK aborts for real). In the free tier the paid call runs
   * to the end on the server and is settled: cancel only closes the client's view («Ya se pagó esta pantalla»).
   */
  readonly cancelStopsBilling: boolean;
  /** One «Generar con IA» (≤ 3 screens) + 10 block actions for 24 h in the free tier; a local id elsewhere. */
  openSession(body: RenderSessionBody, options?: TransportCallOptions): Promise<TransportSession>;
  /** The art direction (structured output). Throws `RenderTransportError`. */
  direction(body: DirectionBody, options?: TransportCallOptions): Promise<TransportDirection>;
  /**
   * One screen as events: `progress` (the first one, `received: 0`, says the response began), `block` for each root
   * as it closes, `usage`, then exactly one `done`. Failures are an `error` event before `done`, never a throw.
   */
  screen(body: ScreenBody, options?: TransportCallOptions): AsyncIterable<RenderStreamEvent>;
  /** «Otra versión» / «Pedir cambio» of one block (one session action). Throws `RenderTransportError`. */
  block(body: BlockBody, options?: TransportCallOptions): Promise<TransportBlock>;
}

/** A failed session, direction or block call. `body` is the route's error (with its session counters when known). */
export class RenderTransportError extends Error {
  readonly code: RenderErrorCode;
  readonly status: number | undefined;
  readonly body: RenderApiError;
  constructor(body: RenderApiError, status?: number) {
    super(body.message);
    this.name = "RenderTransportError";
    this.code = body.code;
    this.status = status;
    this.body = body;
  }
}

export const isRenderErrorCode = (value: unknown): value is RenderErrorCode =>
  isAiApiErrorCode(value) || (typeof value === "string" && (RENDER_SESSION_ERROR_CODES as readonly string[]).includes(value));

const isAbort = (error: unknown, signal?: AbortSignal) =>
  signal?.aborted === true || (error instanceof Error && (error.name === "AbortError" || error.name === "APIUserAbortError"));

export const abortedError = (): RenderApiError => ({ code: "aborted", message: "Request aborted" });
export const networkError = (): RenderApiError => ({ code: "network", message: "Could not reach the server" });

/** The error of a route answer (any status), from its JSON body when it has one. */
export async function renderErrorOf(response: Response): Promise<RenderApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // not JSON
  }
  const value = (body && typeof body === "object" ? body : {}) as Partial<RenderApiError>;
  if (isRenderErrorCode(value.code)) return { ...value, code: value.code, message: typeof value.message === "string" ? value.message : `HTTP ${response.status}` } as RenderApiError;
  const code: RenderErrorCode =
    response.status === 413 ? "payload-too-large" : response.status === 429 ? "rate-limited" : response.status === 400 ? "invalid-request" : response.status >= 500 ? "upstream-error" : "invalid-response";
  return { code, message: `HTTP ${response.status}` };
}

// ── Cache priming (spec §3.3) ─────────────────────────────────────────────────────────────────────────────────
// The screens of a session share the cached prefix (contract + art direction), but a cache entry exists only once a
// response has begun. Three screens fired together would all WRITE it. So the first screen of a session starts at
// once and the others wait for its first event (≈ 1 s: the prompt was read) or `PRIME_MAX_WAIT_MS`, then run in
// parallel and READ it (`cache_read_input_tokens > 0` from the 2nd screen on).

export const PRIME_MAX_WAIT_MS = 12_000;

type Gate = { ready: Promise<void>; open: () => void };
const gates = new Map<string, Gate>();

/** Waits until a screen of `sessionId` may start; returns what to call when its response began (or ended). */
export async function enterScreen(sessionId: string, signal?: AbortSignal, maxWaitMs = PRIME_MAX_WAIT_MS): Promise<() => void> {
  const gate = gates.get(sessionId);
  if (!gate) {
    let open!: () => void;
    const ready = new Promise<void>((resolve) => {
      open = resolve;
    });
    gates.set(sessionId, { ready, open });
    // Keep the map small: a session's gate is useless once open.
    void ready.then(() => setTimeout(() => gates.delete(sessionId), 60_000));
    return open;
  }
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, maxWaitMs);
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    void gate.ready.then(done);
    signal?.addEventListener("abort", done, { once: true });
  });
  return () => {};
}

/** Tests. */
export function resetScreenGates(): void {
  gates.clear();
}

// ── Free tier ─────────────────────────────────────────────────────────────────────────────────────────────────

const JSON_HEADERS = { "Content-Type": "application/json" };

async function postJson<T>(url: string, body: unknown, options: TransportCallOptions): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
      ...(options.signal && { signal: options.signal }),
    });
  } catch (error) {
    throw new RenderTransportError(isAbort(error, options.signal) ? abortedError() : networkError());
  }
  if (!response.ok) {
    const error = await renderErrorOf(response);
    updateAiCounters(countersFrom(error));
    throw new RenderTransportError(error, response.status);
  }
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new RenderTransportError(isAbort(error, options.signal) ? abortedError() : { code: "invalid-response", message: "The answer is not JSON" });
  }
}

const isEventStream = (response: Response) => (response.headers.get("content-type") ?? "").includes("text/event-stream");

async function* freeScreen(body: ScreenBody & RenderChoice, options: TransportCallOptions): AsyncGenerator<RenderStreamEvent> {
  const started = await enterScreen(body.sessionId, options.signal);
  try {
    let response: Response;
    try {
      response = await fetch(RENDER_ENDPOINT, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ task: "screen", ...body }),
        credentials: "same-origin",
        cache: "no-store",
        ...(options.signal && { signal: options.signal }),
      });
    } catch (error) {
      yield { type: "error", error: isAbort(error, options.signal) ? abortedError() : networkError() };
      yield { type: "done", session: null };
      return;
    }
    if (!response.ok || !response.body || !isEventStream(response)) {
      const error = response.ok ? { code: "invalid-response" as const, message: "Expected an event stream" } : await renderErrorOf(response);
      updateAiCounters(countersFrom(error));
      yield { type: "error", error };
      yield { type: "done", session: error.session ?? null };
      return;
    }
    let done = false;
    try {
      for await (const event of readRenderStream(response.body)) {
        started();
        // Nothing more is shown after «Cancelar», not even what was already buffered.
        if (options.signal?.aborted) throw options.signal.reason ?? new DOMException("Aborted", "AbortError");
        if (event.type === "done") done = true;
        yield event;
        if (done) return;
      }
    } catch (error) {
      // Cancel in the free tier only closes this view: the server finishes the call and settles it (spec §5.3 [C8]).
      yield { type: "error", error: isAbort(error, options.signal) ? abortedError() : networkError() };
      yield { type: "done", session: null };
      return;
    }
    if (!done) {
      yield { type: "error", error: networkError() };
      yield { type: "done", session: null };
    }
  } finally {
    started();
  }
}

/**
 * «Acceso completo» (../fullAccess): the model and finish a full-access account picked, sent with every hosted call.
 * Empty for everyone else (the server refuses them from the free tier).
 */
export function fullAccessChoice(status: AiStatusResponse | null): RenderChoice {
  if (!status?.fullAccess) return {};
  const model = getFullAccessRenderModel();
  return { ...(model && { model }), tier: getRenderTier() };
}

/** The hosted free tier (`model` = the status' `freeModel`), or a full-access account's `choice`. */
export function freeTransport(model: string, choice: RenderChoice = {}): RenderTransport {
  return {
    path: "free",
    model: choice.model ?? model,
    tier: choice.tier ?? "mockup",
    cancelStopsBilling: false,
    async openSession(body, options = {}) {
      const answer = await postJson<RenderSessionSuccess>(RENDER_SESSION_ENDPOINT, { ...body, ...choice }, options);
      updateAiCounters(countersFrom(answer));
      return answer;
    },
    async direction(body, options = {}) {
      return postJson<RenderDirectionSuccess>(RENDER_ENDPOINT, { task: "direction", ...body, ...choice }, options);
    },
    screen: (body, options = {}) => freeScreen({ ...body, ...choice }, options),
    async block(body, options = {}) {
      return postJson<RenderBlockSuccess>(RENDER_BLOCK_ENDPOINT, { ...body, ...choice }, options);
    },
  };
}

// ── BYOK ──────────────────────────────────────────────────────────────────────────────────────────────────────

export type ByokTransportOptions = {
  /** Read at call time (`getByokKey`): the transport never keeps the key. */
  getKey: () => string | null;
  model: string;
  /** Default `mockup`. */
  tier?: AiRenderTier;
};

const noKey = (): RenderApiError => ({ code: "invalid-key", message: "No API key in this tab" });

/** The user's own key, from the browser (Opus 5.5 by default, Sonnet 5.5 as the cheaper option). */
export function byokTransport(options: ByokTransportOptions): RenderTransport {
  const load = () => import("./byok");
  const key = () => {
    const value = options.getKey();
    if (!value) throw new RenderTransportError(noKey());
    return value;
  };
  const tier = options.tier ?? "mockup";
  return {
    path: "byok",
    model: options.model,
    tier,
    cancelStopsBilling: true,
    async openSession() {
      return { sessionId: crypto.randomUUID(), session: null };
    },
    async direction(body, call = {}) {
      const apiKey = key();
      return (await load()).byokDirection(body, { apiKey, model: options.model, tier, ...call });
    },
    async *screen(body, call = {}) {
      const apiKey = options.getKey();
      if (!apiKey) {
        yield { type: "error", error: noKey() };
        yield { type: "done", session: null };
        return;
      }
      const { byokScreen } = await load();
      yield* byokScreen(body, { apiKey, model: options.model, tier, ...call });
    },
    async block(body, call = {}) {
      const apiKey = key();
      return (await load()).byokBlock(body, { apiKey, model: options.model, tier, ...call });
    },
  };
}

// ── Choosing a path ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * Which paid path a «Generar con IA» takes (the policy of every AI feature): the user's key wins; otherwise the free
 * tier while it can open a session; otherwise `reason`, and the UI offers the key or «Copiar prompt para mi Claude».
 */
export function renderPathFor(status: AiStatusResponse | null, byokActive: boolean): { path: "byok" | "free"; reason: null } | { path: null; reason: AiFallbackReason } {
  if (byokActive) return { path: "byok", reason: null };
  const reason = hostedBlocker(status);
  return reason ? { path: null, reason } : { path: "free", reason: null };
}

/** The transport of a paid path: the free tier with the status' model, or BYOK with the chosen model and the tab's key. */
export function createRenderTransport(path: "free" | "byok", context: { status: AiStatusResponse | null; byokModel?: string; getKey?: () => string | null; tier?: AiRenderTier }): RenderTransport {
  if (path === "free") return freeTransport(context.status?.freeModel ?? OFFLINE_AI_STATUS.freeModel, fullAccessChoice(context.status));
  return byokTransport({ getKey: context.getKey ?? (() => null), model: context.byokModel ?? DEFAULT_BYOK_RENDER_MODEL, ...(context.tier && { tier: context.tier }) });
}

export { MANUAL_MODEL, manualTransport } from "./manual";
