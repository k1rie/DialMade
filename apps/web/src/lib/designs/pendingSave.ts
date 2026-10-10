"use client";

// «Guardar» without an account opens the login. GitHub, Google and the magic link leave the page (the
// magic link even opens in another tab), so the design waits here, in this browser only, until the user
// comes back signed in to `/?resume=save`. It expires after an hour and is removed once saved.
import type { DesignDoc } from "@dialmade/doc";

const KEY = "dialmade.pendingSave";
const TTL_MS = 60 * 60 * 1000;

export const RESUME_PARAM = "resume";
export const RESUME_SAVE = "save";
/** Where a sign-in started by «Guardar» comes back to. */
export const RESUME_SAVE_PATH = `/?${RESUME_PARAM}=${RESUME_SAVE}`;

export type PendingSave = { doc: DesignDoc; savedId: string | null; at: number };

export function stashPendingSave(doc: DesignDoc, savedId: string | null, now = Date.now()): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ doc, savedId, at: now } satisfies PendingSave));
    return true;
  } catch {
    return false;
  }
}

/** The waiting design (not removed: `clearPendingSave` once it is saved). `null` when none or expired. */
export function readPendingSave(now = Date.now()): PendingSave | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PendingSave>;
    if (!value || typeof value !== "object" || !value.doc || typeof value.at !== "number" || now - value.at > TTL_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return { doc: value.doc, savedId: typeof value.savedId === "string" ? value.savedId : null, at: value.at };
  } catch {
    return null;
  }
}

export function clearPendingSave() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
