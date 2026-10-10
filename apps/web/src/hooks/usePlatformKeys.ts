"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const isApple = () => document.documentElement.dataset.platform === "apple";

export type PlatformKeys = {
  mod: string;
  alt: string;
  shift: string;
  /** A shortcut as the platform writes it: «⇧⌘Z» on Apple, «Shift+Ctrl+Z» elsewhere. */
  combo: (...keys: string[]) => string;
};

const APPLE: PlatformKeys = { mod: "⌘", alt: "⌥", shift: "⇧", combo: (...keys) => keys.join("") };
const OTHER: PlatformKeys = { mod: "Ctrl", alt: "Alt", shift: "Shift", combo: (...keys) => keys.join("+") };

/** Modifier labels for the current platform (the layout's boot script sets `data-platform`). */
export function usePlatformKeys(): PlatformKeys {
  return useSyncExternalStore(subscribe, isApple, () => false) ? APPLE : OTHER;
}
