"use client";

import type { BlockId, GridRect } from "@dialmade/layout";
import type { FocusEvent, KeyboardEvent, RefObject } from "react";
import type { Tool } from "../types";
import { keyboardGrabStep, type GrabStep, type KeyboardGrab } from "./gestures";

/** What the canvas does for each key; the hook only decides which one applies. */
export type CanvasKeyboardActions = {
  /** Space/Enter on a block of a derived (read-only) view: select it and say why it does not move. */
  readOnly: (id: BlockId) => void;
  grab: (step: Extract<GrabStep, { type: "grab" }>) => void;
  nudge: (step: Extract<GrabStep, { type: "move" | "resize" }>) => void;
  drop: (grab: KeyboardGrab) => void;
  cancel: (grab: KeyboardGrab) => void;
  remove: (id: BlockId) => void;
  duplicate: (id: BlockId) => void;
  rename: () => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: Tool) => void;
  deselect: () => void;
};

export type CanvasKeyboardOptions = {
  rootRef: RefObject<HTMLElement | null>;
  /** Rect of a block as shown now (desktop grid units), to pick it up. */
  rectOf: (id: BlockId) => GridRect | null;
  editable: boolean;
  columns: number;
  selectedId: BlockId | null;
  grab: KeyboardGrab | null;
  /** Single-key shortcuts (R, V, H, Supr, F2) can be turned off (WCAG 2.1.4). */
  shortcutsEnabled: boolean;
  actions: CanvasKeyboardActions;
};

const TOOL_KEYS: Readonly<Record<string, Tool>> = { r: "draw", v: "edit", h: "hand" };

function isEditable(element: HTMLElement): boolean {
  return element.isContentEditable || element.closest("input, textarea, select, [contenteditable='true']") !== null;
}

/**
 * Keyboard of the canvas, scoped to its DOM (events bubbling from portals are ignored):
 * - On a focused block: Space/Enter picks it up (desktop), arrows move it 1 column / 8 px, Shift + arrows
 *   resize it, Space/Enter/Tab drop it and Esc cancels; Supr/Backspace deletes, ⌘/Ctrl+D duplicates and
 *   F2 goes to the inspector's name field.
 * - Anywhere in the canvas: ⌘/Ctrl+Z undo, ⇧⌘Z or Ctrl+Y redo, R/V/H tools, Esc deselects.
 * Single keys only act when the shortcuts switch is on. Focus leaving a held block drops it.
 */
export function useCanvasKeyboard({ rootRef, rectOf, editable, columns, selectedId, grab, shortcutsEnabled, actions }: CanvasKeyboardOptions) {
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (event.defaultPrevented || !rootRef.current?.contains(target) || isEditable(target)) return;
    const blockId = target.getAttribute("data-block-id");
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key;

    // Keys of a held block first: nothing else runs while a block is held (its batch is open).
    if (grab) {
      if (blockId && !mod && !event.altKey) {
        const rect = rectOf(blockId);
        const step = rect ? keyboardGrabStep(grab, { key, shiftKey: event.shiftKey, id: blockId, rect, columns }) : null;
        if (step && step.type !== "none") {
          if (key !== "Tab") event.preventDefault();
          if (step.type === "drop") actions.drop(step.grab);
          else if (step.type === "cancel") actions.cancel(step.grab);
          else if (step.type === "move" || step.type === "resize") actions.nudge(step);
          return;
        }
      }
      // Undo/redo would land inside the open batch: swallow them until the block is dropped.
      if (mod && (key.toLowerCase() === "z" || key.toLowerCase() === "y")) event.preventDefault();
      return;
    }

    if (blockId && !mod && !event.altKey && (key === " " || key === "Enter")) {
      event.preventDefault();
      if (!editable) {
        actions.readOnly(blockId);
        return;
      }
      const rect = rectOf(blockId);
      const step = rect ? keyboardGrabStep(null, { key, shiftKey: event.shiftKey, id: blockId, rect, columns }) : null;
      if (step?.type === "grab") actions.grab(step);
      return;
    }

    if (mod && !event.altKey) {
      const lower = key.toLowerCase();
      if (lower === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.redo();
        else actions.undo();
        return;
      }
      if (lower === "y" && event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        actions.redo();
        return;
      }
      if (lower === "d" && blockId && editable) {
        event.preventDefault();
        actions.duplicate(blockId);
      }
      return;
    }
    if (event.altKey) return;

    if (key === "Escape") {
      if (selectedId) actions.deselect();
      return;
    }
    if (!shortcutsEnabled) return;
    if ((key === "Delete" || key === "Backspace") && blockId && editable) {
      event.preventDefault();
      actions.remove(blockId);
      return;
    }
    if (key === "F2" && blockId) {
      event.preventDefault();
      actions.rename();
      return;
    }
    const tool = !event.shiftKey ? TOOL_KEYS[key.toLowerCase()] : undefined;
    if (tool) {
      event.preventDefault();
      actions.setTool(tool);
    }
  };

  /** Focus leaving the held block drops it where it is (like Tab). */
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!grab) return;
    const next = event.relatedTarget as HTMLElement | null;
    if (next?.getAttribute("data-block-id") === grab.id) return;
    if ((event.target as HTMLElement).getAttribute("data-block-id") !== grab.id) return;
    actions.drop(grab);
  };

  return { onKeyDown, onBlur };
}
