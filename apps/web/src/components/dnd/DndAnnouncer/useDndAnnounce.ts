"use client";

import { useContext } from "react";
import { DndAnnounceContext } from "./context";

const noop = () => {};

/** Announces a message in the DnD live region, e.g. after a click/keyboard alternative to dragging. */
export function useDndAnnounce(): (message: string) => void {
  return useContext(DndAnnounceContext) ?? noop;
}
