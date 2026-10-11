// The tab's choice of model for «Acceso completo» (memory only, like the BYOK model). Client side: the routes import
// ./fullAccessModel instead.
import { useSyncExternalStore } from "react";
import type { FullAccessRenderModel } from "./fullAccessModel";

// `null` until picked = the server's free model.
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
