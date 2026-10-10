"use client";

// One saved design: a gradient of its palette (ref. 10A Magnific), its name and when it was edited. The
// card opens it; «⋯» has Abrir, Renombrar, Duplicar and Borrar. Renaming happens in place (Enter saves,
// Esc cancels). In the list view the same card lies flat.
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Popover } from "@/components/ui/Popover";
import { useDictionary, useLocale } from "@/i18n";
import { authText } from "@/i18n/auth";
import { cn } from "@/lib/cn";
import type { DesignSummary } from "@/lib/designs/client";
import { snappy } from "@/lib/motion";
import { MoreIcon } from "../icons";
import { relativeTime } from "../relativeTime";

export type DesignCardProps = {
  design: DesignSummary;
  view: "grid" | "list";
  busy?: boolean;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export const openHref = (id: string) => `/?design=${encodeURIComponent(id)}`;

/** The palette as a soft diagonal gradient, with a white glow on top (the app's light). */
export function paletteGradient(swatches: readonly string[]): CSSProperties {
  const colors = swatches.length > 1 ? swatches : [swatches[0] ?? "#7c5cff", swatches[0] ?? "#7c5cff"];
  return {
    backgroundImage: `radial-gradient(120% 90% at 20% 10%, oklch(1 0 0 / 0.22), transparent 55%), linear-gradient(135deg, ${colors.join(", ")})`,
  };
}

const itemClass = "flex h-9 w-full items-center rounded-chip px-2.5 text-left text-small text-fg transition-colors duration-150 hover:bg-white/[0.06] focus-visible:bg-white/[0.06]";

export function DesignCard({ design, view, busy = false, onRename, onDuplicate, onDelete }: DesignCardProps) {
  const t = useDictionary(authText).designs;
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const edited = t.edited(relativeTime(design.updatedAt, locale));

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  const submitRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = inputRef.current?.value.trim() ?? "";
    setRenaming(false);
    if (name && name !== design.name) onRename(name);
  };

  const title = renaming ? (
    <form onSubmit={submitRename} className="min-w-0 flex-1">
      <label htmlFor={`${titleId}-input`} className="sr-only">
        {t.renameLabel}
      </label>
      <input
        ref={inputRef}
        id={`${titleId}-input`}
        defaultValue={design.name}
        maxLength={120}
        onBlur={(event) => event.currentTarget.form?.requestSubmit()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setRenaming(false);
          }
        }}
        className="h-8 w-full rounded-chip border border-accent bg-app px-2 text-small font-medium text-fg"
      />
    </form>
  ) : (
    <Link
      href={openHref(design.id)}
      id={titleId}
      className="min-w-0 flex-1 truncate rounded-chip text-small font-medium text-fg outline-offset-2 after:absolute after:inset-0 after:rounded-card after:content-['']"
    >
      {design.name}
    </Link>
  );

  const menu = (
    <Popover
      open={menuOpen}
      onOpenChange={setMenuOpen}
      label={t.actionsFor(design.name)}
      align="end"
      className="w-44 p-1.5"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={t.actionsFor(design.name)}
          disabled={busy}
          className="relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted transition-colors duration-150 hover:bg-white/[0.08] hover:text-fg disabled:opacity-45 [&_svg]:size-4"
        >
          <MoreIcon />
        </button>
      )}
    >
      <Link href={openHref(design.id)} className={itemClass} onClick={() => setMenuOpen(false)}>
        {t.open}
      </Link>
      <button
        type="button"
        className={itemClass}
        onClick={() => {
          setMenuOpen(false);
          setRenaming(true);
        }}
      >
        {t.rename}
      </button>
      <button
        type="button"
        className={itemClass}
        onClick={() => {
          setMenuOpen(false);
          onDuplicate();
        }}
      >
        {t.duplicate}
      </button>
      <div className="my-1 h-px bg-white/[0.08]" />
      <button
        type="button"
        className={cn(itemClass, "text-danger")}
        onClick={() => {
          setMenuOpen(false);
          onDelete();
        }}
      >
        {t.delete}
      </button>
    </Popover>
  );

  const swatches = (
    <span className="flex -space-x-1" aria-hidden>
      {design.preview.swatches.slice(0, 4).map((color) => (
        <span key={color} className="size-3 rounded-full border border-black/30" style={{ background: color }} />
      ))}
    </span>
  );

  if (view === "list") {
    return (
      <motion.li layout transition={snappy} aria-busy={busy || undefined} className="group relative flex items-center gap-3 rounded-card border border-app bg-surface px-3 py-2.5 shadow-surface transition-colors duration-150 hover:bg-surface-hover">
        <span aria-hidden className="size-10 shrink-0 rounded-[10px] border border-white/10" style={paletteGradient(design.preview.swatches)} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {title}
          <span className="text-caption text-muted">{edited}</span>
        </div>
        <span className="hidden text-caption text-subtle sm:inline">{t.screens(design.preview.screens)}</span>
        {swatches}
        {menu}
      </motion.li>
    );
  }

  return (
    <motion.li layout transition={snappy} aria-busy={busy || undefined} className="group relative flex flex-col overflow-hidden rounded-card border border-app bg-surface shadow-surface transition-[border-color] duration-150 hover:border-app-strong">
      <div aria-hidden className="relative aspect-[16/10] w-full transition-transform duration-300 ease-out group-hover:scale-[1.02]" style={paletteGradient(design.preview.swatches)}>
        <span className="absolute right-3 bottom-3 rounded-chip bg-black/35 px-1.5 py-0.5 font-mono text-[11px] text-white/90 backdrop-blur-sm">{t.screens(design.preview.screens)}</span>
      </div>
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {title}
          <span className="text-caption text-muted">{edited}</span>
        </div>
        {menu}
      </div>
    </motion.li>
  );
}
