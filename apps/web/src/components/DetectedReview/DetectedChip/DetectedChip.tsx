"use client";

import type { DetectionEdit, Mode } from "@dialmade/import";
import { parseColorWithAlpha, type RoleKey } from "@dialmade/palette";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { DraggableItem } from "@/components/dnd/DraggableItem";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useDictionary, useI18n } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { CHIP_ENTER, CHIP_STAGGER, CHIP_STAGGER_MAX, DETECTED_COLOR_TYPE } from "../constants";
import { CloseIcon, LockIcon, MoonIcon, MoreIcon, PencilIcon, PlusIcon, RestoreIcon, SunIcon, UnlockIcon } from "../icons";
import { chipValue, chipWhat, editorInitial, hexLabel, roleLabel } from "../labels";
import { SLOT_ROLES, detectedOf, effectiveColor, type ChipItem, type ChipState } from "../model";
import { ChipEditor, type ChipEditorKind } from "./ChipEditor";
import { ChipMenu, type ChipMenuItem } from "./ChipMenu";
import { FontMatchPicker, fontAlternatives } from "./FontMatchPicker";

export type DetectedChipProps = {
  item: ChipItem;
  state: ChipState;
  locked: boolean;
  /** Third-party colors and fonts: shown, never applied. */
  readOnly: boolean;
  edit?: DetectionEdit;
  /** Colors: another color holds its role and mode right now. */
  alternative?: boolean;
  /** Mode the role slots show (the menu's «Usar como…» puts the color there). */
  slotMode: Mode;
  /** Position in its group, for the entrance stagger. */
  index: number;
  onAccept: () => void;
  onDismiss: () => void;
  onRestore: () => void;
  onLock: (locked: boolean) => void;
  /** Validated edit; returns nothing. */
  onEdit: (edit: DetectionEdit) => void;
  onAssign: (role: RoleKey | null) => void;
  onCopy: (value: string) => void;
};

const CHECKER =
  "repeating-conic-gradient(oklch(1 0 0 / 0.16) 0% 25%, oklch(1 0 0 / 0.04) 0% 50%) 50% / 8px 8px";

function Visual({ item, edit }: { item: ChipItem; edit?: DetectionEdit }): ReactNode {
  const frame = "relative size-8 shrink-0 overflow-hidden rounded-chip shadow-[inset_0_0_0_1px_oklch(1_0_0/0.12)]";
  switch (item.kind) {
    case "color": {
      const eff = effectiveColor(item.color, edit);
      const color = eff.alpha === undefined ? eff.hex : `color-mix(in oklab, ${eff.hex} ${Math.round(eff.alpha * 100)}%, transparent)`;
      return (
        <span aria-hidden className={frame} style={{ background: CHECKER }}>
          <span className="absolute inset-0" style={{ backgroundColor: color }} />
        </span>
      );
    }
    case "font":
      return (
        <span aria-hidden className={cn(frame, "flex items-center justify-center bg-white/[0.05] text-[15px] text-fg")} style={{ fontFamily: `"${edit?.family ?? item.font.family}", var(--font-sans)` }}>
          Aa
        </span>
      );
    case "type":
      return (
        <span aria-hidden className={cn(frame, "flex items-center justify-center bg-white/[0.05] font-mono text-[11px] text-muted")}>
          {item.style.step ?? "T"}
        </span>
      );
    case "radius": {
      const px = Math.min(edit?.px ?? item.dim.px, 14);
      return (
        <span aria-hidden className={cn(frame, "flex items-center justify-center bg-white/[0.03]")}>
          <span className="size-5 border-t-2 border-l-2 border-fg/70" style={{ borderTopLeftRadius: px, transform: "translate(3px, 3px)" }} />
        </span>
      );
    }
    case "border":
      return (
        <span aria-hidden className={cn(frame, "flex items-center justify-center bg-white/[0.03]")}>
          <span className="w-5 bg-fg/70" style={{ height: Math.max(1, Math.min(edit?.px ?? item.dim.px, 6)) }} />
        </span>
      );
    case "shadow": {
      const shadow = item.shadow.layers
        .filter((layer) => !layer.inset)
        .slice(0, 4)
        .map((layer) => {
          const color = parseColorWithAlpha(layer.color) ?? "#000000";
          return `${layer.x / 2}px ${layer.y / 2}px ${layer.blur / 2}px ${layer.spread / 2}px color-mix(in oklab, ${color} ${Math.round(layer.alpha * 100)}%, transparent)`;
        })
        .join(", ");
      return (
        <span aria-hidden className={cn(frame, "flex items-center justify-center bg-white/[0.06]")}>
          <span className="size-4 rounded-[4px] bg-white/80" style={{ boxShadow: shadow || "none" }} />
        </span>
      );
    }
    case "space": {
      const px = edit?.px ?? item.dim.px;
      return (
        <span aria-hidden className={cn(frame, "flex items-center justify-center bg-white/[0.03]")}>
          <span className="h-2 rounded-[2px] bg-accent/70" style={{ width: Math.max(2, Math.min(px / 2, 22)) }} />
        </span>
      );
    }
    case "system": {
      const { value } = item.hint;
      const radius = value === "pill" ? 999 : value === "square" ? 1 : 4;
      return (
        <span aria-hidden className={cn(frame, "flex items-center justify-center bg-white/[0.03]")}>
          <span className="h-3 w-5 border-2 border-fg/70" style={{ borderRadius: typeof value === "number" ? 4 : radius, borderWidth: typeof value === "number" ? Math.max(1, Math.round(value / 300)) : 2 }} />
        </span>
      );
    }
  }
}

/**
 * One detection in «Esto detectamos»: its value (hex in mono, «Inter 600», «radio 8 px»), where it comes
 * from, its confidence in words and Editar · Descartar · Bloquear. Colors drag onto the role slots
 * (Space/Enter by keyboard) or go there with «Usar como…» (click, the ⋯ button, Shift+F10).
 */
export function DetectedChip({
  item,
  state,
  locked,
  readOnly,
  edit,
  alternative = false,
  slotMode,
  index,
  onAccept,
  onDismiss,
  onRestore,
  onLock,
  onEdit,
  onAssign,
  onCopy,
}: DetectedChipProps) {
  const t = useDictionary(importText).review;
  const { locale } = useI18n();
  const d = detectedOf(item);
  const anchorRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [openHint, setOpenHint] = useState<string | null>(null);

  const value = chipValue(item, edit, t, locale);
  const what = chipWhat(item, edit, t);
  const confidence = t.confidence[d.confidence] ?? d.confidence;
  const dismissed = state === "dismissed";
  const accepted = state === "accepted";
  const color = item.kind === "color" ? item.color : undefined;
  const eff = color ? effectiveColor(color, edit) : undefined;
  const mode = color && (color.mode || edit?.mode) ? eff?.mode : undefined;
  const edited = !!(edit?.color || edit?.family || edit?.px !== undefined);
  const editorKind: ChipEditorKind | null =
    item.kind === "color" ? "color" : item.kind === "font" ? "family" : item.kind === "shadow" || item.kind === "system" ? null : "px";
  const draggable = !!color && !readOnly && !dismissed;
  const alternatives = item.kind === "font" && accepted && !readOnly ? fontAlternatives(item.font) : [];

  // The light and dark versions of a color share a value: the mode goes in every name («#F1CB1C (oscuro)»).
  const named = mode ? t.chip.withMode(value, t.badges[mode]) : value;
  const description = t.chip.describe(named, what, d.locator, t.confidenceLabel(confidence), t.chip.states[state]);

  const closeMenu = (restoreFocus: boolean) => {
    setMenuOpen(false);
    if (restoreFocus) anchorRef.current?.querySelector<HTMLElement>("[role='button']")?.focus({ preventScroll: true });
  };
  const closeEditor = () => {
    setEditing(false);
    requestAnimationFrame(() => editRef.current?.focus({ preventScroll: true }));
  };

  const save = (raw: string): string | undefined => {
    if (item.kind === "color") {
      if (!parseColorWithAlpha(raw)) return t.chip.invalidColor;
      onEdit({ color: raw });
    } else if (item.kind === "font") {
      if (!raw) return t.chip.invalidFamily;
      onEdit({ family: raw === item.font.family ? undefined : raw });
    } else {
      const px = Number(raw.replace(",", "."));
      if (!Number.isFinite(px) || px < 0 || px > 512) return t.chip.invalidNumber;
      onEdit({ px });
    }
    closeEditor();
    return undefined;
  };

  const menuItems: ChipMenuItem[] = color
    ? [
        ...SLOT_ROLES.map((role) => ({
          id: role,
          label: roleLabel(role, t),
          checked: eff?.role === role && eff.mode === slotMode,
        })),
        { id: "none", label: t.chip.noRole, checked: !eff?.role },
        { id: "copy", label: t.chip.copy, separatorBefore: true },
      ]
    : [];

  const onKeyDown = (event: KeyboardEvent) => {
    if (!draggable) return;
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      setMenuOpen(true);
    }
  };
  const onContextMenu = (event: MouseEvent) => {
    if (!draggable) return;
    event.preventDefault();
    setMenuOpen(true);
  };

  const content = (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className={cn("contents", dismissed && "[&>*]:opacity-50")}>
        <Visual item={item} edit={edit} />
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn("truncate text-small text-fg", item.kind !== "font" && "font-mono tabular-nums", dismissed && "line-through decoration-white/30")}>{value}</span>
          {mode && (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-caption text-muted">
              {mode === "dark" ? <MoonIcon className="size-3" /> : <SunIcon className="size-3" />}
              <span className="sr-only">{t.badges[mode]}</span>
            </span>
          )}
        </span>
        <span className="flex min-w-0 items-center gap-1 text-caption text-muted">
          <span className="shrink-0 font-medium text-fg/80">{what}</span>
          <span aria-hidden className="text-subtle">
            ·
          </span>
          <span className="truncate font-mono text-[11px]" title={d.locator}>
            {d.locator}
          </span>
        </span>
      </span>
    </span>
  );

  const badges: { id: string; label: string; hint?: string; tone?: "accent" | "warning" | "muted" }[] = [
    ...(readOnly ? [{ id: "third", label: t.badges.thirdParty, tone: "warning" as const }] : []),
    ...(d.method === "ai" ? [{ id: "ai", label: t.badges.ai, tone: "accent" as const }] : []),
    ...(d.method === "pixel" ? [{ id: "pixel", label: t.badges.pixel }] : []),
    ...(edited ? [{ id: "edited", label: t.badges.edited, tone: "accent" as const }] : []),
    ...(d.isFrameworkDefault ? [{ id: "default", label: t.badges.defaultTheme, hint: t.badges.defaultThemeHint }] : []),
    ...(alternative && accepted ? [{ id: "alt", label: t.badges.alternative, hint: t.badges.alternativeHint, tone: "warning" as const }] : []),
    ...((d.also?.length ?? 0) > 0 ? [{ id: "also", label: t.chip.more(d.also!.length) }] : []),
  ];

  return (
    <motion.li
      data-chip-id={item.id}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { ...tween(CHIP_ENTER), delay: Math.min(index, CHIP_STAGGER_MAX) * CHIP_STAGGER } }}
      exit={{ opacity: 0, transition: tween(0.12) }}
      className={cn(
        "flex flex-col gap-2 rounded-card border p-2 transition-[background-color,border-color] duration-150",
        accepted ? "border-app bg-white/[0.035]" : "border-dashed border-app bg-transparent",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <div ref={anchorRef} className="min-w-44 flex-1" onKeyDown={onKeyDown} onContextMenu={onContextMenu}>
          {draggable ? (
            <DraggableItem
              id={`detected-${item.id}`}
              type={DETECTED_COLOR_TYPE}
              label={value}
              aria-label={description}
              data={{ detectedId: item.id }}
              className="block rounded-control focus-visible:outline-offset-2"
              liftClassName="rounded-control bg-app-elevated/0"
              onActivate={() => setMenuOpen(true)}
            >
              {content}
            </DraggableItem>
          ) : (
            <div aria-label={description} role="group">
              {content}
            </div>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <span className="shrink-0 rounded-[6px] border border-app px-1.5 py-0.5 text-[11px] leading-none font-medium text-muted" title={t.confidenceLabel(confidence)}>
            {confidence}
          </span>
          {!readOnly && (
            <div className="flex shrink-0 items-center">
              {dismissed ? (
                <IconButton data-chip-action="restore" label={`${t.chip.restore} ${named}`} icon={<RestoreIcon />} size="sm" onClick={onRestore} />
              ) : (
                <>
                  {accepted && editorKind && (
                    <IconButton
                      ref={editRef}
                      data-chip-action="edit"
                      label={`${t.chip.edit} ${named}`}
                      icon={<PencilIcon />}
                      size="sm"
                      aria-expanded={editing}
                      onClick={() => setEditing((open) => !open)}
                    />
                  )}
                  {!accepted && <IconButton data-chip-action="use" label={`${t.chip.use} ${named}`} icon={<PlusIcon />} size="sm" onClick={onAccept} />}
                  {color && (
                    <IconButton label={`${t.chip.useAs} ${named}`} icon={<MoreIcon />} size="sm" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} />
                  )}
                  {accepted && (
                    // A toggle keeps its name; the state is aria-pressed (and the tooltip says what it means).
                    <IconButton
                      data-chip-action="lock"
                      label={`${t.chip.lock} ${named}`}
                      tooltip={locked ? t.chip.locked : t.chip.unlocked}
                      icon={locked ? <LockIcon className="text-accent" /> : <UnlockIcon />}
                      size="sm"
                      aria-pressed={locked}
                      onClick={() => onLock(!locked)}
                    />
                  )}
                  <IconButton data-chip-action="dismiss" label={`${t.chip.dismiss} ${named}`} icon={<CloseIcon />} size="sm" onClick={onDismiss} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-[42px]">
          {badges.map((badge) => {
            const tone = cn(
              "inline-flex h-5 items-center rounded-[6px] px-1.5 text-[11px] leading-none font-medium",
              badge.tone === "accent" ? "bg-accent-soft text-accent" : badge.tone === "warning" ? "bg-warning/12 text-warning" : "bg-white/[0.06] text-muted",
            );
            if (!badge.hint) {
              return (
                <span key={badge.id} className={tone}>
                  {badge.label}
                </span>
              );
            }
            // Tooltips only show for a mouse or the keyboard: a tap opens the same text inline.
            return (
              <Tooltip key={badge.id} content={badge.hint}>
                <button
                  type="button"
                  aria-expanded={openHint === badge.id}
                  onClick={() => setOpenHint((current) => (current === badge.id ? null : badge.id))}
                  className={cn(tone, "underline decoration-dotted underline-offset-2")}
                >
                  {badge.label}
                </button>
              </Tooltip>
            );
          })}
          {openHint && badges.find((badge) => badge.id === openHint)?.hint && (
            <p className="m-0 basis-full text-caption text-pretty text-muted">{badges.find((badge) => badge.id === openHint)!.hint}</p>
          )}
        </div>
      )}
      <AnimatePresence initial={false}>
        {editing && editorKind && (
          <ChipEditor key="editor" kind={editorKind} initial={editorInitial(item, edit)} label={t.chip.editLabel(what)} onSave={save} onCancel={closeEditor} />
        )}
      </AnimatePresence>
      {alternatives.length > 0 && item.kind === "font" && (
        <FontMatchPicker font={item.font} value={edit?.family ?? item.font.family} onPick={(family) => onEdit({ family: family ?? undefined })} />
      )}
      {color && (
        <ChipMenu
          open={menuOpen}
          label={t.chip.menu(value)}
          anchorRef={anchorRef}
          items={menuItems}
          onSelect={(id) => {
            if (id === "copy") onCopy(eff ? hexLabel(eff.hex) : value);
            else onAssign(id === "none" ? null : (id as RoleKey));
            closeMenu(true);
          }}
          onClose={closeMenu}
        />
      )}
    </motion.li>
  );
}
