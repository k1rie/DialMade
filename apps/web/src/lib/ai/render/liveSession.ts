// The design session that is alive on this tab (spec §5.2, user decision 2): one free use = 1 «Generar con IA» (≤ 3
// screens) + 10 block actions in 24 h. Whoever opens a session (the generation store of track A, or «Ajustar» when a
// block action has none) publishes it here; the block actions read it and spend from it. Outside React (zustand
// vanilla), so the generation store can write it from its orchestration. The id is a server-checked handle bound
// to this device's cookie (not a secret), kept in sessionStorage so a reload does not lose the actions left.
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import type { RenderSessionCounters } from "./api";

export type LiveSession = {
  sessionId: string;
  counters: RenderSessionCounters;
};

type LiveSessionState = { session: LiveSession | null };

const STORAGE_KEY = "dialmade.ai.renderSession";

const isAlive = (session: LiveSession | null, now = Date.now()): session is LiveSession =>
  session !== null && Date.parse(session.counters.expiresAt) > now;

function readStored(): LiveSession | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveSession;
    return typeof parsed?.sessionId === "string" && typeof parsed.counters?.expiresAt === "string" && isAlive(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStored(session: LiveSession | null) {
  try {
    if (session) globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(session));
    else globalThis.sessionStorage?.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: the session lives in memory only.
  }
}

export const liveSessionStore = createStore<LiveSessionState>(() => ({ session: readStored() }));

/** Publishes a session that was just opened, or the counters a call answered with (`null` forgets it). */
export function setLiveSession(session: LiveSession | null) {
  liveSessionStore.setState({ session });
  writeStored(session);
}

/** Updates the counters of the live session (every render answer carries them). Ignored for another session. */
export function updateLiveSessionCounters(sessionId: string, counters: RenderSessionCounters) {
  const current = liveSessionStore.getState().session;
  if (current?.sessionId === sessionId) setLiveSession({ sessionId, counters });
}

/** The live session, or `null` when there is none or it expired. */
export function getLiveSession(now = Date.now()): LiveSession | null {
  const session = liveSessionStore.getState().session;
  return isAlive(session, now) ? session : null;
}

/** Block actions left in a session. */
export const actionsLeft = (counters: RenderSessionCounters): number => Math.max(0, counters.actionsMax - counters.actionsUsed);

/** The live session in React (re-renders when it changes; expiry is checked on read). */
export function useLiveSession(): LiveSession | null {
  const session = useStore(liveSessionStore, (state) => state.session);
  return isAlive(session) ? session : null;
}
