// «Acceso completo» to the hosted AI (supabase/migrations/20261011090000_ai_full_access.sql), the client-safe half:
// which models a full-access account may pick for «Diseño con IA» on the server's key, and the tab's choice.
import { useSyncExternalStore } from "react";

/** Every model the hosted «Diseño con IA» can run for a full-access account, cheapest first. */
export const FULL_ACCESS_RENDER_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"] as const;
export type FullAccessRenderModel = (typeof FULL_ACCESS_RENDER_MODELS)[number];

export const isFullAccessRenderModel = (value: unknown): value is FullAccessRenderModel =>
  typeof value === "string" && (FULL_ACCESS_RENDER_MODELS as readonly string[]).includes(value);

/** Short names for the picker («Haiku 5.5»). */
export const fullAccessModelName = (model: FullAccessRenderModel): string =>
  ({ "claude-haiku-5-5": "Haiku 5.5", "claude-sonnet-5-5": "Sonnet 5.5", "claude-opus-5-5": "Opus 5.5" })[model];

// The tab's choice (memory only, like the BYOK model): `null` until picked = the server's free model.
let model: FullAccessRenderModel | null = null;
const listeners = new Set<() => void>();

export const getFullAccessRenderModel = (): FullAccessRenderModel | null => model;

export function setFullAccessRenderModel(next: FullAccessRenderModel): void {
  if (next === model) return;
  model = next;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useFullAccessRenderModel(): FullAccessRenderModel | null {
  return useSyncExternalStore(subscribe, getFullAccessRenderModel, () => null);
}
