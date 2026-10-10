import { LEGACY_LOCK_POINTERS, LOCK_KEYS } from "./constants";
import { coversPointer } from "./pointer";
import type { DesignDoc, Lock, LockKey } from "./schema";

const isLegacyKey = (lock: string): lock is LockKey => (LOCK_KEYS as readonly string[]).includes(lock);

/** The pointer a lock stands for: legacy keys map through `LEGACY_LOCK_POINTERS` (`"pairingId"` → `/brief/pairingId`). */
export function lockPointer(lock: Lock | string): string {
  return isLegacyKey(lock) ? LEGACY_LOCK_POINTERS[lock] : lock;
}

/** Locks that `applyPatch` enforces: the JSON Pointer entries of `brief.locks`. */
export function hardLocks(doc: Pick<DesignDoc, "brief">): string[] {
  return doc.brief.locks.filter((lock) => lock.startsWith("/"));
}

export interface LockQueryOptions {
  /** Ignore legacy keys (soft locks). Default `false`: «Barajar», palette styles and the AI respect both. */
  hardOnly?: boolean;
}

/**
 * The lock that covers `pointer` (the same pointer or an ancestor), or `undefined`. A legacy key
 * counts as its pointer unless `hardOnly`. `pointer` may also be a legacy key.
 */
export function lockedBy(doc: Pick<DesignDoc, "brief">, pointer: Lock | string, options: LockQueryOptions = {}): Lock | undefined {
  const target = lockPointer(pointer);
  return doc.brief.locks.find((lock) => {
    if (options.hardOnly && !lock.startsWith("/")) return false;
    return coversPointer(lockPointer(lock), target);
  });
}

/** True when `pointer` or one of its ancestors is locked. */
export function isLocked(doc: Pick<DesignDoc, "brief">, pointer: Lock | string, options: LockQueryOptions = {}): boolean {
  return lockedBy(doc, pointer, options) !== undefined;
}

/** Locks at or below `pointer` (`/tokens/color` → every locked color role), as pointers. */
export function locksWithin(doc: Pick<DesignDoc, "brief">, pointer: string, options: LockQueryOptions = {}): string[] {
  return doc.brief.locks
    .filter((lock) => !options.hardOnly || lock.startsWith("/"))
    .map(lockPointer)
    .filter((lock) => coversPointer(pointer, lock));
}
