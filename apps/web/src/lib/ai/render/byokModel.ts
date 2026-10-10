"use client";

// The model «Diseño con IA» uses with the user's own key (spec §14, decision 3): Opus 5.5 by default, Sonnet 5.5
// offered as the cheaper option. Like the key itself (@/lib/ai/byokKey), the choice lives only in the tab's memory.
import { useSyncExternalStore } from "react";

export const BYOK_RENDER_MODELS = ["claude-opus-5-5", "claude-sonnet-5-5"] as const;
export type ByokRenderModel = (typeof BYOK_RENDER_MODELS)[number];
export const DEFAULT_BYOK_RENDER_MODEL: ByokRenderModel = "claude-opus-5-5";
/** The «Más barato» option of the cost line and the key dialog. */
export const CHEAPER_BYOK_RENDER_MODEL: ByokRenderModel = "claude-sonnet-5-5";

export const isByokRenderModel = (value: unknown): value is ByokRenderModel =>
  typeof value === "string" && (BYOK_RENDER_MODELS as readonly string[]).includes(value);

let model: ByokRenderModel = DEFAULT_BYOK_RENDER_MODEL;
const listeners = new Set<() => void>();

export function getByokRenderModel(): ByokRenderModel {
  return model;
}

export function setByokRenderModel(next: ByokRenderModel): void {
  if (!isByokRenderModel(next) || next === model) return;
  model = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export function useByokRenderModel(): ByokRenderModel {
  return useSyncExternalStore(subscribe, getByokRenderModel, () => DEFAULT_BYOK_RENDER_MODEL);
}
