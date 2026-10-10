"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, type KeyboardEvent } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { popVariants } from "@/lib/motion";
import { REGION_AUTOFOCUS_ATTR } from "../../constants";
import { CloseIcon, SearchIcon } from "../../icons";

export type LibrarySearchProps = {
  value: string;
  onChange: (value: string) => void;
  /** Arrow Down from the field: focus the first tile below. */
  onArrowDown: () => void;
  /** Id of the results grid while searching (`aria-controls`). */
  controls?: string;
  className?: string;
};

/** Max characters of the query (names and synonyms are far shorter; see `MAX_QUERY_LENGTH`). */
const MAX_LENGTH = 64;

/**
 * «Buscar bloques»: names and synonyms in Spanish and English («agenda», «header»). Esc clears a
 * non-empty query (then lets Esc through), Arrow Down jumps to the first tile. F6 into the library
 * lands here (`data-region-autofocus`).
 */
export function LibrarySearch({ value, onChange, onArrowDown, controls, className }: LibrarySearchProps) {
  const t = useDictionary(layout);
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && value) {
      event.preventDefault();
      event.stopPropagation();
      onChange("");
    } else if (event.key === "ArrowDown" && !event.altKey) {
      event.preventDefault();
      onArrowDown();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {t.library.searchLabel}
      </label>
      <SearchIcon aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        maxLength={MAX_LENGTH}
        placeholder={t.library.searchPlaceholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        aria-controls={controls}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        {...{ [REGION_AUTOFOCUS_ATTR]: "" }}
        className={cn(
          "h-9 w-full min-w-0 rounded-control border border-app-strong bg-app/60 ps-9 pe-9 text-small text-fg placeholder:text-muted",
          "transition-[border-color,background-color] duration-150 hover:border-white/20 focus-visible:border-accent/70 focus-visible:bg-app/80",
          "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
        )}
      />
      <AnimatePresence initial={false}>
        {value && (
          <motion.button
            key="clear"
            type="button"
            aria-label={t.library.clearSearch}
            onClick={() => {
              onChange("");
              inputRef.current?.focus(); // the button goes away with the query
            }}
            variants={popVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              "absolute end-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-chip text-muted transition-colors duration-150",
              "hover:bg-white/[0.06] hover:text-fg focus-visible:outline-2 focus-visible:outline-accent",
            )}
          >
            <CloseIcon className="size-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
