// The generation's transport from Track C's `../transport` (free tier, BYOK, «mi Claude»): the engine speaks the
// never-throwing `RenderTransport` of ./types (wire bodies WITH `task`), Track C's transports throw
// `RenderTransportError` and take bodies without it. This adapter is the only bridge, so the engine never knows which
// path answered. `currentAccessTransport` picks the path the way every AI feature does (the user's key wins, else the
// free tier while it can open a session).
import { loadAiStatus } from "@/hooks/useAiStatus";
import { getByokKey } from "../../byokKey";
import type { RenderApiError } from "../api";
import { getByokRenderModel } from "../byokModel";
import { getRenderTier } from "../renderTier";
import { RenderTransportError, abortedError, createRenderTransport, networkError, renderPathFor, type RenderTransport as AccessTransport } from "../transport";
import type { RenderTransport, TransportResult } from "./types";

const isAbort = (error: unknown, signal?: AbortSignal) =>
  signal?.aborted === true || (error instanceof Error && (error.name === "AbortError" || error.name === "APIUserAbortError"));

const errorOf = (error: unknown, signal?: AbortSignal): RenderApiError => {
  if (error instanceof RenderTransportError) return error.body;
  return isAbort(error, signal) ? abortedError() : networkError();
};

async function settle<T>(call: () => Promise<T>, signal?: AbortSignal): Promise<TransportResult<T>> {
  try {
    return { ok: true, value: await call() };
  } catch (error) {
    return { ok: false, error: errorOf(error, signal) };
  }
}

/** Track C's bodies are the route's without `task` (each method names its own). */
function withoutTask<T extends { task: string }>(body: T): Omit<T, "task"> {
  const copy: Partial<T> = { ...body };
  delete copy.task;
  return copy as Omit<T, "task">;
}

/** Track C's transport as the generation's (never throws; an aborted stream ends with an `aborted` error event). */
export function fromAccessTransport(access: AccessTransport): RenderTransport {
  const options = (signal?: AbortSignal) => (signal ? { signal } : {});
  return {
    path: access.path,
    model: access.model,
    tier: access.tier,
    cancelStopsBilling: access.cancelStopsBilling,
    openSession: (body, signal) => settle(() => access.openSession(body, options(signal)), signal),
    direction: (body, signal) => settle(() => access.direction(withoutTask(body), options(signal)), signal),
    block: (body, signal) => settle(() => access.block(body, options(signal)), signal),
    screen: (body, signal) => access.screen(withoutTask(body), options(signal)),
  };
}

/** A transport whose every call fails with `error` (no paid path is open: the UI offers the way out). */
const closedTransport = (error: RenderApiError): RenderTransport => ({
  path: "free",
  openSession: async () => ({ ok: false, error }),
  direction: async () => ({ ok: false, error }),
  block: async () => ({ ok: false, error }),
  async *screen() {
    yield { type: "error", error };
    yield { type: "done", session: null };
  },
});

/**
 * The paid path of a new «Generar con IA» or block action right now: BYOK when the tab holds a key (Opus 5.5 by
 * default, the model chosen in the key dialog), else the hosted free tier, else a closed transport with the reason.
 */
export async function currentAccessTransport(): Promise<AccessTransport | RenderApiError> {
  const status = await loadAiStatus();
  const choice = renderPathFor(status, getByokKey() !== null);
  if (!choice.path) return { code: choice.reason === "not-configured" ? "ai-not-configured" : choice.reason, message: "No AI path is open" };
  return createRenderTransport(choice.path, { status, byokModel: getByokRenderModel(), getKey: getByokKey, tier: getRenderTier() });
}

/** `currentAccessTransport` as the generation's transport. */
export async function currentGenerationTransport(): Promise<RenderTransport> {
  const access = await currentAccessTransport();
  return "path" in access ? fromAccessTransport(access) : closedTransport(access);
}
