"use client";

import { suggestBlocks, type BlockCategory } from "@dialmade/layout";
import { motion } from "motion/react";
import { useCallback, useDeferredValue, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { BlockIcon } from "../icons";
import { searchBlocks } from "../searchBlocks";
import { selectActiveScreen, useLayoutStore } from "../useLayoutStore";
import { TILE_ATTR } from "./constants";
import { LibraryCategory } from "./LibraryCategory";
import type { LibraryItemProps } from "./LibraryItem";
import { DEFAULT_OPEN_CATEGORIES, LIBRARY_CATEGORIES } from "./libraryModel";
import { LibrarySearch } from "./LibrarySearch";
import { TileGrid } from "./TileGrid";
import { useLibraryInsert } from "./useLibraryInsert";

/** Both locales: «agenda» finds the calendar and «header» the navbar whatever the UI language. */
const SEARCH_DICTS = [layout.es.blocks, layout.en.blocks] as const;

const HEADING = "px-1.5 text-caption font-semibold tracking-[0.01em] text-fg";

export type BlockLibraryProps = { className?: string };

/**
 * «Bloques» (refs 11F Klaviyo + 11B Replit): search over names and synonyms in both languages, five
 * «Sugeridos» for the active screen, then the categories as collapsible grids of tiles. A tile is
 * dragged onto the canvas, or clicked / Enter to insert it in the next free slot (inside the selected
 * container), with a polite announcement. An empty search offers a free block named after the query.
 * Lives inside the library area of LayoutStep, which owns the landmark; F6 lands on the search field.
 */
export function BlockLibrary({ className }: BlockLibraryProps) {
  const t = useDictionary(layout);
  const id = useId();
  const kind = useLayoutStore((state) => selectActiveScreen(state)?.kind ?? "landing");
  const screenLayout = useLayoutStore((state) => selectActiveScreen(state)?.layout ?? null);
  const { insert, insertFree } = useLibraryInsert();

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const trimmed = deferredQuery.trim();
  const searching = trimmed !== "";
  const results = useMemo(() => searchBlocks(deferredQuery, SEARCH_DICTS), [deferredQuery]);
  const suggested = useMemo(() => (screenLayout ? suggestBlocks(screenLayout, kind) : []), [screenLayout, kind]);

  const [open, setOpen] = useState<ReadonlySet<BlockCategory>>(() => new Set(DEFAULT_OPEN_CATEGORIES));
  const toggle = useCallback(
    (category: BlockCategory) =>
      setOpen((previous) => {
        const next = new Set(previous);
        if (!next.delete(category)) next.add(category);
        return next;
      }),
    [],
  );

  const ids = useMemo(
    () => ({ status: `${id}-status`, results: `${id}-results`, suggested: `${id}-suggested` }),
    [id],
  );
  const hints = useMemo<LibraryItemProps["hints"]>(
    () => ({ insert: `${id}-hint-insert`, soon: `${id}-hint-soon`, frame: `${id}-hint-frame`, appOnly: `${id}-hint-app` }),
    [id],
  );

  const bodyRef = useRef<HTMLDivElement>(null);
  const focusFirstTile = useCallback(() => {
    const tile = bodyRef.current?.querySelector<HTMLElement>(`[${TILE_ATTR}]`)?.firstElementChild;
    if (tile instanceof HTMLElement) tile.focus();
  }, []);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Shared descriptions of the tiles (aria-describedby). */}
      <div hidden>
        <p id={hints.insert}>{`${t.library.insertHint} ${t.library.grabHint}`}</p>
        <p id={hints.soon}>{t.library.soonHint}</p>
        <p id={hints.frame}>{t.library.frameInApp}</p>
        <p id={hints.appOnly}>{t.library.appOnly}</p>
      </div>

      {/* The search stays reachable while the categories scroll under it. */}
      <div className="sticky top-0 z-10 -mx-3 -mt-3 flex flex-col gap-1.5 bg-app-elevated px-3 pt-3 pb-1">
        <LibrarySearch value={query} onChange={setQuery} onArrowDown={focusFirstTile} controls={searching ? ids.results : undefined} />
        <p id={ids.status} role="status" className={cn("px-1.5 text-caption text-subtle", !searching && "sr-only")}>
          {searching ? t.library.results(results.length) : ""}
        </p>
      </div>

      <div ref={bodyRef} className="flex flex-col gap-4">
        {searching ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tween(0.14)}>
            {results.length > 0 ? (
              <TileGrid
                id={ids.results}
                types={results}
                section="results"
                instance={id}
                kind={kind}
                onInsert={insert}
                hints={hints}
                aria-labelledby={ids.status}
              />
            ) : (
              <div id={ids.results} className="flex flex-col items-center gap-3 rounded-card border border-dashed border-app-strong px-4 py-5 text-center">
                <p className="text-small text-pretty text-muted">{t.library.noResults(trimmed)}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  leadingIcon={<BlockIcon type="free" />}
                  aria-label={t.library.useFreeLabel(trimmed)}
                  onClick={() => insertFree(trimmed)}
                >
                  {t.library.useFree}
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="browse" className="flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tween(0.14)}>
            {suggested.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 id={ids.suggested} className={HEADING}>
                  {t.library.suggested}
                </h3>
                <TileGrid
                  types={suggested}
                  section="suggested"
                  instance={id}
                  kind={kind}
                  onInsert={insert}
                  hints={hints}
                  aria-labelledby={ids.suggested}
                />
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {LIBRARY_CATEGORIES.map(({ category, types }) => (
                <LibraryCategory
                  key={category}
                  category={category}
                  types={types}
                  open={open.has(category)}
                  onToggle={toggle}
                  instance={id}
                  kind={kind}
                  onInsert={insert}
                  hints={hints}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
