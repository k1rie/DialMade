"use client";

import { useEffect, useRef } from "react";

export type ComposerShortcuts = {
  undo: () => void;
  redo: () => void;
  /** Esc with nothing else to close. */
  deselect: () => void;
  /** ⌥↑ / ⌥↓ on the canvas: move the selected section. */
  move: (delta: -1 | 1) => void;
};

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/**
 * ⌘Z / Ctrl+Z undo, ⇧⌘Z / Ctrl+Y redo, Esc deselects and ⌥↑/⌥↓ move the selection. Text fields keep
 * their native shortcuts. Popovers stop their own Esc first.
 */
export function useComposerShortcuts(handlers: ComposerShortcuts) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditable(event.target)) return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) latest.current.redo();
        else latest.current.undo();
        return;
      }
      if (event.ctrlKey && !event.metaKey && key === "y") {
        event.preventDefault();
        latest.current.redo();
        return;
      }
      if (event.key === "Escape") {
        latest.current.deselect();
        return;
      }
      const inCanvas = event.target instanceof Element && event.target.closest(".dl-page");
      if (event.altKey && inCanvas && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        latest.current.move(event.key === "ArrowUp" ? -1 : 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
