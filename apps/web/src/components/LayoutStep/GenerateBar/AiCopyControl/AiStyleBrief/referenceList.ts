import type { StyleReference } from "@/lib/ai/render/generation";

/**
 * The list after adding `added` to what is attached NOW (not to what it was when the files started to be read: a
 * paste during a read, or a thumbnail removed meanwhile, would be undone). Never more than `max`.
 */
export function appendReferences(current: readonly StyleReference[], added: readonly StyleReference[], max: number): StyleReference[] {
  const known = new Set(current.map((reference) => reference.id));
  return [...current, ...added.filter((reference) => !known.has(reference.id))].slice(0, max);
}

/** How many more files fit given what is attached now. */
export const roomFor = (current: readonly StyleReference[], max: number): number => Math.max(0, max - current.length);

/** An id that two reads started in the same millisecond cannot share. */
export const referenceId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
