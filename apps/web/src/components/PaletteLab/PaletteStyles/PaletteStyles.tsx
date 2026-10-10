"use client";

import { PALETTE_STYLES, type ColorMode, type PaletteStyleId } from "@dialmade/palette";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { DraggableItem } from "@/components/dnd/DraggableItem";
import { DropSlot } from "@/components/dnd/DropSlot";
import { useDictionary, useI18n } from "@/i18n";
import { palette } from "@/i18n/palette";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { SLOT_IDS, STYLE_TYPE, VISIBLE_STYLES } from "../constants";
import { ChevronDownIcon, DragIcon, MoonIcon } from "../icons";
import { StyleStrip } from "./StyleStrip";
import { useStyleThemes } from "./useStyleThemes";

export type PaletteStylesProps = {
  styleId: PaletteStyleId;
  primary: string;
  secondary?: string;
  /** Applies a style; `defaultMode` is the mode it is designed for (dark for «Lujo oscuro» and «Neón»). */
  onSelect: (styleId: PaletteStyleId, defaultMode: ColorMode) => void;
};

const isStyleId = (value: unknown): value is PaletteStyleId => PALETTE_STYLES.some((style) => style.id === value);

/**
 * «Estilos de paleta»: one row per style with a strip of what it does to the brand (Recraft's «More»
 * rows). Rows drag onto the «Estilo» slot or apply on click; five show until «N más».
 */
export function PaletteStyles({ styleId, primary, secondary, onSelect }: PaletteStylesProps) {
  const t = useDictionary(palette).styles;
  const { t: common, locale } = useI18n();
  const announce = useDndAnnounce();
  const listId = useId();
  const themes = useStyleThemes(primary, secondary);
  const [expanded, setExpanded] = useState(false);

  const current = PALETTE_STYLES.find((style) => style.id === styleId) ?? PALETTE_STYLES[0]!;
  const selectedIndex = PALETTE_STYLES.indexOf(current);
  const rows = PALETTE_STYLES.filter((_, index) => expanded || index < VISIBLE_STYLES || index === selectedIndex);
  const hidden = PALETTE_STYLES.length - rows.length;
  const select = (id: PaletteStyleId) => onSelect(id, themes[id]?.defaultMode ?? "light");

  return (
    <div className="flex flex-col gap-3">
      <DropSlot<{ styleId?: unknown }>
        id={SLOT_IDS.style}
        accept={STYLE_TYPE}
        label={t.slot}
        className="rounded-card"
        onDrop={(item) => {
          if (isStyleId(item.data.styleId)) select(item.data.styleId);
        }}
      >
        {(state) => (
          <div
            className={cn(
              "flex items-center gap-3 rounded-card border p-2.5 transition-[border-color] duration-150",
              state === "over" || state === "compatible" ? "border-transparent" : "border-app bg-white/[0.03]",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-caption text-muted">{state === "over" || state === "compatible" ? common.dnd.dropHere : t.slot}</p>
              <p className="mt-0.5 truncate text-small font-semibold text-fg">{current.label[locale]}</p>
              <p className="truncate text-caption text-muted" title={current.description[locale]}>
                {current.description[locale]}
              </p>
            </div>
            <StyleStrip theme={themes[current.id]} className="h-9 w-[44%] shrink-0" />
          </div>
        )}
      </DropSlot>

      <ul id={listId} className="flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {rows.map((style) => {
            const selected = style.id === styleId;
            const name = style.label[locale];
            const dark = themes[style.id]?.defaultMode === "dark";
            return (
              <motion.li
                key={style.id}
                layout="position"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: tween(0.12) }}
                transition={tween(0.2)}
              >
                <DraggableItem
                  id={`palette-style-${style.id}`}
                  type={STYLE_TYPE}
                  label={t.item(name)}
                  aria-label={`${t.item(name)}${selected ? ` · ${t.slot}` : ""}`}
                  title={style.description[locale]}
                  data={{ styleId: style.id }}
                  className="block rounded-control"
                  onActivate={() => {
                    select(style.id);
                    announce(common.dnd.placed(t.item(name), t.slot));
                  }}
                >
                  <span
                    className={cn(
                      "group flex h-9 items-center gap-2.5 rounded-control border pr-1.5 pl-1 transition-[background-color,border-color] duration-150",
                      selected ? "glow-purple border-transparent bg-accent-soft" : "border-transparent hover:border-app hover:bg-white/[0.04]",
                      "[[data-dragging]_&]:border-app-strong [[data-dragging]_&]:bg-surface",
                    )}
                  >
                    <DragIcon className="size-3.5 shrink-0 text-subtle opacity-60 transition-opacity group-hover:opacity-100" />
                    <span className={cn("w-[6.5rem] shrink-0 truncate text-small", selected ? "font-medium text-fg" : "text-muted group-hover:text-fg")}>
                      {name}
                    </span>
                    <StyleStrip theme={themes[style.id]} className="h-5 min-w-0 flex-1" />
                    <span className="flex w-4 shrink-0 justify-center text-subtle" title={dark ? t.defaultDark : undefined}>
                      {dark && <MoonIcon className="size-3.5" />}
                    </span>
                  </span>
                </DraggableItem>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {PALETTE_STYLES.length > VISIBLE_STYLES && (expanded || hidden > 0) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((open) => !open)}
          className="inline-flex h-7 w-fit items-center gap-1.5 rounded-chip px-2 text-small text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-fg"
        >
          {expanded ? t.less : t.more(hidden)}
          <ChevronDownIcon className={cn("size-3.5 transition-transform duration-200", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
