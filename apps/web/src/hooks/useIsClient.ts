"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false during SSR and hydration, true afterwards — without a setState in an effect. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
