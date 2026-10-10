"use client";

// GET /api/ai/status once per page load, shared by every AI surface (copy, vision, the usage meter).
// Each hosted answer carries the new counters; `updateAiCounters` applies them so «3 de 5 usos
// gratis este mes» stays in sync everywhere without refetching.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { STATUS_ENDPOINT, type AiStatusResponse } from "@/lib/ai/api";
import { OFFLINE_AI_STATUS, mergeAiCounters, normalizeAiStatus, type AiCounters } from "@/lib/ai/policy";

let snapshot: AiStatusResponse | null = null;
let request: Promise<AiStatusResponse> | null = null;
const listeners = new Set<() => void>();

function publish(next: AiStatusResponse) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

/** The device's status (it also sets the anonymous device cookie). Never rejects: offline → «off». */
export function loadAiStatus(options: { force?: boolean } = {}): Promise<AiStatusResponse> {
  if (options.force || !request) {
    request = fetch(STATUS_ENDPOINT, { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then(normalizeAiStatus)
      .catch(() => OFFLINE_AI_STATUS)
      .then((status) => {
        publish(status);
        return status;
      });
  }
  return request;
}

/** Applies the counters of a hosted answer (success or error) to the shared status. */
export function updateAiCounters(counters: AiCounters): void {
  if (!snapshot || Object.keys(counters).length === 0) return;
  const next = mergeAiCounters(snapshot, counters);
  request = Promise.resolve(next);
  publish(next);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const getSnapshot = () => snapshot;
const getServerSnapshot = () => null;

export type UseAiStatus = {
  /** `null` until the first answer. */
  status: AiStatusResponse | null;
  refresh: () => Promise<AiStatusResponse>;
};

export function useAiStatus(): UseAiStatus {
  const status = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    void loadAiStatus();
  }, []);
  const refresh = useCallback(() => loadAiStatus({ force: true }), []);
  return { status, refresh };
}
