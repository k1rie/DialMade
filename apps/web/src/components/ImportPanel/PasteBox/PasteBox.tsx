"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { reducedFade, tween } from "@/lib/motion";
import { ChevronDownIcon, ClipboardIcon } from "../icons";

export type PasteBoxProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  /** Localized format of the pasted text, once detected. */
  format?: string;
  detecting?: boolean;
  /** Over the paste limit. */
  tooLong?: string;
  disabled?: boolean;
  onAdd: () => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

/** «Pegar colores o código»: a folded textarea whose format is detected as you paste (hex, CSS, tokens, DESIGN.md…). */
export function PasteBox({ open, onOpenChange, value, onChange, format, detecting, tooLong, disabled = false, onAdd, textareaRef }: PasteBoxProps) {
  const t = useDictionary(importText).panel.paste;
  const bodyId = useId();
  const textareaId = useId();
  const statusId = useId();
  const status = tooLong ?? (value.trim() ? (detecting ? t.detecting : format ? t.detected(format) : t.detecting) : t.empty);
  const reduced = useReducedMotion();
  // Screen readers hear the result once per change, never «Detectando…» at every pause in typing.
  const [announced, setAnnounced] = useState("");
  const settled = tooLong ?? (value.trim() && !detecting && format ? t.detected(format) : "");
  if (settled && settled !== announced) setAnnounced(settled);

  return (
    <div className="rounded-card border border-app bg-white/[0.02]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => onOpenChange(!open)}
        className="flex h-11 w-full items-center gap-2.5 rounded-card px-3 text-left text-small font-medium text-fg transition-colors duration-150 hover:bg-white/[0.03]"
      >
        <ClipboardIcon className="size-4 text-muted" />
        <span className="flex-1">{t.toggle}</span>
        <ChevronDownIcon className={cn("size-4 text-muted transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="paste"
            id={bodyId}
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduced ? reducedFade : tween(0.24)}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2.5 border-t border-app p-3">
              <label htmlFor={textareaId} className="sr-only">
                {t.label}
              </label>
              <textarea
                ref={textareaRef}
                id={textareaId}
                value={value}
                disabled={disabled}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                rows={5}
                placeholder={t.placeholder}
                aria-describedby={statusId}
                aria-invalid={tooLong ? true : undefined}
                onChange={(event) => onChange(event.target.value)}
                className="min-h-28 w-full resize-y rounded-control border border-app-strong bg-black/25 px-3 py-2.5 font-mono text-mono text-fg placeholder:text-subtle"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p id={statusId} className={cn("text-caption", tooLong ? "text-danger" : "text-muted")}>
                  {status}
                </p>
                <span aria-live="polite" className="sr-only">
                  {announced}
                </span>
                <Button size="sm" disabled={disabled || !value.trim() || !!tooLong} onClick={onAdd}>
                  {t.add}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
