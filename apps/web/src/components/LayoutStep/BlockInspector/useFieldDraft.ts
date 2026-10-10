"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";

/*
 * Twin of `ScreenPanel/useFieldDraft.ts` (folders cannot share private modules). Fase B can move one copy
 * to `LayoutStep/useFieldDraft.ts`.
 */

/** Applies the text; `false` keeps the draft (the value was refused). */
export type DraftCommit = (text: string) => boolean | void;

type Draft = { key: string; text: string; commit: DraftCommit };

export type FieldDraft = {
  /** What the input shows: the draft while editing, else the stored value. */
  value: string;
  /** There is an edit not applied yet. */
  dirty: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

/**
 * An input over a stored value that writes on blur or Enter, never per keystroke (one undo step per edit;
 * inside the field ⌘Z stays the browser's text undo). Esc restores the stored value. `key` names what is
 * edited (block id + field): a draft is always committed to the target it was typed for, even when the
 * selection changed before the blur (a click on another block selects it on pointerdown, then blurs).
 */
export function useFieldDraft(key: string, stored: string, commit: DraftCommit): FieldDraft {
  const [draft, setDraft] = useState<Draft | null>(null);
  const current = draft && draft.key === key ? draft : null;

  // The input can unmount with an edit pending (the block was deleted or deselected elsewhere): keep it.
  const pending = useRef<Draft | null>(null);
  useEffect(() => {
    pending.current = draft;
  }, [draft]);
  useEffect(
    () => () => {
      const last = pending.current;
      if (last) last.commit(last.text);
    },
    [],
  );

  const flush = (): boolean => {
    if (!draft) return true;
    // An untouched value of the current target needs no write (and no announcement).
    const unchanged = draft.key === key && draft.text === stored;
    const accepted = unchanged ? true : draft.commit(draft.text) !== false;
    if (accepted) {
      pending.current = null;
      setDraft(null);
    }
    return accepted;
  };

  return {
    value: current ? current.text : stored,
    dirty: current !== null && current.text !== stored,
    onChange: (event) => setDraft({ key, text: event.target.value, commit }),
    onBlur: () => {
      flush();
    },
    onKeyDown: (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        flush();
      } else if (event.key === "Escape" && draft) {
        event.preventDefault();
        event.stopPropagation();
        pending.current = null;
        setDraft(null);
      }
    },
  };
}
