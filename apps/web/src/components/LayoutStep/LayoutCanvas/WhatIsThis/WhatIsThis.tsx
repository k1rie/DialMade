"use client";

import { getBlockDef, suggestTypesForShape, type BlockId, type GridRect, type LayoutDoc, type LibraryBlockType, type ScreenKind } from "@dialmade/layout";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { layout as layoutText } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { BlockIcon, SearchIcon } from "../../icons";
import { searchBlocks } from "../../searchBlocks";
import { moveActive, whatIsThisOptions } from "./options";

export type WhatIsThisProps = {
  blockId: BlockId;
  /** The drawn box (desktop grid units) and its layout: the shape suggestions come from them. */
  rect: GridRect;
  layout: LayoutDoc;
  kind: ScreenKind;
  /** The block element the panel sits next to. */
  getAnchor: () => HTMLElement | null;
  onChoose: (type: LibraryBlockType) => void;
  /** «Dejar como bloque libre» or Esc: closes and returns focus to the block. */
  onKeepFree: () => void;
  /** A press outside: closes without moving focus (the press decides where it goes). */
  onDismiss: () => void;
};

/** Both locales: «agenda» finds the calendar and «header» the navbar whatever the UI language. */
const SEARCH_DICTS = [layoutText.es.blocks, layoutText.en.blocks] as const;
const GAP = 10;
const MARGIN = 12;
/** 30 ms between options, never past 200 ms in total (feedback budget). */
const STAGGER = 0.03;
const STAGGER_MAX = 0.08;

/**
 * «¿Qué es esto?»: after drawing a box, a non-modal dialog next to it with a search (the library's
 * `searchBlocks`, both locales) and five suggestions from the box's shape (`suggestTypesForShape`), the
 * first one highlighted. Combobox pattern: the input keeps focus, ↑/↓ move the highlight, Enter picks it.
 * Esc or «Dejar como bloque libre» keeps the free block.
 */
export function WhatIsThis({ blockId, rect, layout, kind, getAnchor, onChoose, onKeepFree, onDismiss }: WhatIsThisProps) {
  const t = useDictionary(layoutText);
  const reduce = useReducedMotion();
  const baseId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const suggestions = useMemo(() => suggestTypesForShape(rect, layout, kind, { id: blockId }), [rect, layout, kind, blockId]);
  const options = useMemo(
    () => whatIsThisOptions({ query, suggestions, kind, search: (text) => searchBlocks(text, SEARCH_DICTS) }),
    [query, suggestions, kind],
  );
  const activeIndex = active < options.types.length ? active : options.types.length > 0 ? 0 : -1;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  // Place next to the block (right, else left, else below), inside the viewport. Writes styles directly:
  // it follows scrolls and resizes without re-rendering.
  const getAnchorRef = useRef(getAnchor);
  useLayoutEffect(() => {
    getAnchorRef.current = getAnchor;
  });
  useLayoutEffect(() => {
    const place = () => {
      const panel = panelRef.current;
      const anchor = getAnchorRef.current()?.getBoundingClientRect();
      if (!panel || !anchor) return;
      const { offsetWidth: width, offsetHeight: height } = panel;
      const fitsRight = anchor.right + GAP + width <= window.innerWidth - MARGIN;
      const fitsLeft = anchor.left - GAP - width >= MARGIN;
      let left: number;
      let top: number;
      if (fitsRight || fitsLeft) {
        left = fitsRight ? anchor.right + GAP : anchor.left - GAP - width;
        top = anchor.top;
      } else {
        left = anchor.left;
        top = anchor.bottom + GAP;
      }
      panel.style.left = `${Math.min(Math.max(MARGIN, left), window.innerWidth - width - MARGIN)}px`;
      panel.style.top = `${Math.min(Math.max(MARGIN, top), window.innerHeight - height - MARGIN)}px`;
      panel.style.visibility = "visible";
    };
    place();
    const panel = panelRef.current;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    if (panel) observer?.observe(panel);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { capture: true, passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, { capture: true });
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Esc anywhere keeps the free block; a press outside closes. Capture phase, so the canvas' own Esc
  // (deselect) does not also run.
  const latest = useRef({ onKeepFree, onDismiss });
  useLayoutEffect(() => {
    latest.current = { onKeepFree, onDismiss };
  });
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      latest.current.onKeepFree();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      latest.current.onDismiss();
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(moveActive(activeIndex, event.key === "ArrowDown" ? 1 : -1, options.types.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const type = options.types[activeIndex];
      if (type) onChoose(type);
    }
  };

  // Non-modal, but Tab out of either end closes it and returns to the block (never to the end of the page).
  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("input, button:not([disabled])") ?? []);
    const edge = event.shiftKey ? focusable[0] : focusable[focusable.length - 1];
    if (event.target !== edge) return;
    event.preventDefault();
    onKeepFree();
  };

  const titleId = `${baseId}-title`;
  const hintId = `${baseId}-hint`;
  const listId = `${baseId}-list`;
  const listLabelId = `${baseId}-list-label`;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={hintId}
      className="fixed z-[900] w-80 max-w-[calc(100vw-24px)]"
      style={{ left: -9999, top: -9999, visibility: "hidden" }}
      onKeyDown={onPanelKeyDown}
    >
      <motion.div
        className="flex flex-col gap-2.5 rounded-card border border-app-strong bg-app-elevated p-3 text-fg shadow-lift"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={tween(0.16)}
      >
        <div>
          <h2 id={titleId} className="text-small font-semibold text-fg">
            {t.whatIsThis.title}
          </h2>
          <p id={hintId} className="mt-0.5 text-caption text-muted">
            {t.whatIsThis.hint}
          </p>
        </div>
        <label className="flex h-9 items-center gap-2 rounded-control border border-app-strong bg-white/[0.03] px-2.5 text-muted focus-within:border-accent [&_svg]:size-3.5">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label={t.whatIsThis.searchLabel}
            aria-expanded={options.types.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
            autoComplete="off"
            spellCheck={false}
            value={query}
            placeholder={t.whatIsThis.searchPlaceholder}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            className="min-w-0 flex-1 bg-transparent text-small text-fg outline-none placeholder:text-muted"
          />
        </label>
        <p id={listLabelId} className="text-caption text-muted">
          {options.mode === "suggestions" ? t.whatIsThis.suggestions : t.whatIsThis.results}
        </p>
        {options.types.length > 0 ? (
          <ul role="listbox" id={listId} aria-labelledby={listLabelId} className="-mx-1 flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            {options.types.map((type, index) => {
              const text = t.blocks[type];
              const selected = index === activeIndex;
              const soon = getBlockDef(type).status === "soon";
              return (
                <motion.li
                  key={type}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  onPointerDown={(event) => event.preventDefault()}
                  onPointerMove={() => {
                    if (!selected) setActive(index);
                  }}
                  onClick={() => onChoose(type)}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-control px-2 py-1.5 transition-colors",
                    selected ? "bg-accent-soft text-fg" : "text-muted hover:text-fg",
                  )}
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.12, delay: Math.min(index * STAGGER, STAGGER_MAX) }}
                >
                  <BlockIcon type={type} className="mt-0.5 size-3.5 shrink-0" />
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 text-small font-medium text-fg">
                      {text.name}
                      {soon && <span className="rounded-chip border border-app px-1 text-caption text-muted">{t.canvas.soon}</span>}
                    </span>
                    <span className="truncate text-caption text-muted">{text.description}</span>
                  </span>
                </motion.li>
              );
            })}
          </ul>
        ) : (
          <p id={listId} className="text-small text-muted">
            {t.whatIsThis.noResults(query.trim())}
          </p>
        )}
        <Button variant="ghost" size="sm" className="self-start" onClick={onKeepFree}>
          {t.whatIsThis.keepFree}
        </Button>
      </motion.div>
    </div>,
    document.body,
  );
}
