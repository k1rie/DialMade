"use client";

import { motion } from "motion/react";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { usePlatformKeys } from "@/hooks/usePlatformKeys";
import { useDictionary } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { smooth } from "@/lib/motion";
import { UploadIcon } from "../icons";

export type ImportDropzoneProps = {
  /** Files are being dragged over the window (the whole page takes the drop). */
  over: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
};

/** Ref 1B: a big dashed zone that «breathes» (scale 1.01, purple glow) while files are over the page. */
export function ImportDropzone({ over, disabled = false, onFiles, className }: ImportDropzoneProps) {
  const t = useDictionary(importText).panel;
  const keys = usePlatformKeys();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.section
      aria-label={t.zoneLabel}
      className={cn("relative rounded-panel", className)}
      initial={false}
      animate={{ scale: over ? 1.01 : 1 }}
      transition={smooth}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit] border border-dashed transition-[border-color,background-color] duration-200 ease-out",
          over ? "glow-purple border-accent/80 bg-accent-soft" : "border-white/[0.14] bg-white/[0.01]",
        )}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-0 h-36 bg-[radial-gradient(ellipse_at_top,oklch(1_0_0/0.06),transparent_70%)]"
      />
      <div className="relative flex flex-col items-center gap-4 px-5 py-9 text-center sm:px-10">
        <span
          aria-hidden
          className={cn(
            "flex size-11 items-center justify-center rounded-card border border-app-strong bg-white/[0.04] text-muted shadow-surface transition-colors duration-200",
            over && "text-accent",
          )}
        >
          <UploadIcon className="size-5" />
        </span>
        <div className="flex flex-col items-center gap-1">
          <p className="text-h3 text-fg">{over ? t.dropOver : t.dropTitle}</p>
          <p className="max-w-sm text-small text-pretty text-muted">{t.formats}</p>
        </div>
        <div className="flex flex-col items-center gap-2.5">
          <Button variant="secondary" leadingIcon={<UploadIcon />} disabled={disabled} onClick={() => inputRef.current?.click()}>
            {t.choose}
          </Button>
          <p className="hidden items-center gap-1 text-caption text-muted sm:inline-flex">
            {t.pasteHint}
            <Kbd>{keys.mod}</Kbd>
            <Kbd>V</Kbd>
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onFiles(files);
          event.target.value = "";
        }}
      />
    </motion.section>
  );
}
