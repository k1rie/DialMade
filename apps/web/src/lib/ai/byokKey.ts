"use client";

import { useSyncExternalStore } from "react";

// The user's own Anthropic key lives only in this module, in the memory of the tab: it is never
// stored (no localStorage/IndexedDB), never put in React state and never sent to the Dialmade server.
// Reloading or closing the tab forgets it.
let key: string | null = null;
const listeners = new Set<() => void>();

const KEY_SHAPE = /^sk-ant-[A-Za-z0-9_-]{16,}$/;

/** Loose format check, for an inline hint (the API has the last word). */
export const looksLikeAnthropicKey = (value: string): boolean => KEY_SHAPE.test(value.trim());

export function setByokKey(value: string): void {
  const next = value.trim();
  key = next === "" ? null : next;
  listeners.forEach((listener) => listener());
}

export function clearByokKey(): void {
  setByokKey("");
}

/** Read it only at call time. */
export function getByokKey(): string | null {
  return key;
}

/** «sk-ant-…a1B2», safe to show. */
export function maskKey(value: string): string {
  return value.length > 12 ? `${value.slice(0, 7)}…${value.slice(-4)}` : "…";
}

export type ByokState = { active: boolean; hint: string | null };

const INACTIVE: ByokState = { active: false, hint: null };
let snapshot: ByokState = INACTIVE;
let snapshotKey: string | null = null;

function getSnapshot(): ByokState {
  if (snapshotKey !== key) {
    snapshotKey = key;
    snapshot = key ? { active: true, hint: maskKey(key) } : INACTIVE;
  }
  return snapshot;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** Whether a BYOK key is set in this tab (and its masked hint). Never the key itself. */
export function useByokKey(): ByokState {
  return useSyncExternalStore(subscribe, getSnapshot, () => INACTIVE);
}
