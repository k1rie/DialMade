"use client";

import type { Breakpoint } from "@dialmade/layout";
import { useId, useMemo, type ReactNode } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Kbd } from "@/components/ui/Kbd";
import { Tooltip } from "@/components/ui/Tooltip";
import { usePlatformKeys } from "@/hooks/usePlatformKeys";
import { useDictionary, useLocale } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { DEVICE_WIDTHS } from "@/lib/devices";
import { MonitorIcon, PhoneIcon, RedoIcon, StructureIcon, TabletIcon, UndoIcon } from "../icons";
import { regionSelector } from "../constants";
import { Segmented, type SegmentedOption } from "../Segmented";
import { focusStylePicker } from "../StylePicker";
import { selectActiveScreen, useLayoutActions, useLayoutEnv, useLayoutHistory, useLayoutStore } from "../useLayoutStore";
import { ShortcutsMenu } from "./ShortcutsMenu";
import { styleName } from "./styleName";

export type LayoutTopBarProps = { className?: string };

/** Desktop is drawn; tablet and mobile show the derived layout. */
const DEVICES: readonly Breakpoint[] = ["desktop", "tablet", "mobile"];
const DEVICE_ICONS: Record<Breakpoint, ReactNode> = { desktop: <MonitorIcon />, tablet: <TabletIcon />, mobile: <PhoneIcon /> };

/** Frames the StylePicker may need before it is on screen (the inspector swaps panels on select(null)). */
const STYLE_FOCUS_ATTEMPTS = 3;

/**
 * Bar above the Layout areas: the active screen (name + kind), the device of the canvas (Escritorio /
 * Tablet / Móvil), «Ver estructura», undo/redo with their platform shortcuts, the keyboard settings and
 * the «Estilo: …» chip, which selects nothing and takes focus to the StylePicker in the screen panel.
 * Under 640 px (no canvas) the canvas-only controls are hidden.
 */
export function LayoutTopBar({ className }: LayoutTopBarProps) {
  const t = useDictionary(layout);
  const locale = useLocale();
  const keys = usePlatformKeys();
  const announce = useDndAnnounce();
  const deviceLayoutId = useId();
  const { doc, narrow, focusRegion } = useLayoutEnv();
  const actions = useLayoutActions();
  const history = useLayoutHistory();
  const screenName = useLayoutStore((state) => selectActiveScreen(state)?.name ?? null);
  const screenKind = useLayoutStore((state) => selectActiveScreen(state)?.kind ?? null);
  const device = useLayoutStore((state) => state.device);
  const showStructure = useLayoutStore((state) => state.showStructure);
  const style = useLayoutStore((state) => state.style);
  const currentStyle = styleName(style, locale, t.style.guide, doc.brief.recipeId);

  const deviceOptions = useMemo<SegmentedOption<Breakpoint>[]>(
    () =>
      DEVICES.map((value) => ({
        value,
        label: t.topBar.deviceOption(t.devices[value], DEVICE_WIDTHS[value]),
        icon: DEVICE_ICONS[value],
        iconOnly: true,
      })),
    [t],
  );

  const changeDevice = (next: Breakpoint) => {
    if (next === device) return;
    actions.setDevice(next);
    announce(t.announce.deviceChanged(t.devices[next]));
  };

  const undo = () => {
    history.undo();
    announce(t.announce.undone);
  };
  const redo = () => {
    history.redo();
    announce(t.announce.redone);
  };

  const goToStyle = () => {
    actions.select(null);
    // The screen panel (with the picker) replaces the block inspector on the next render.
    let attempts = 0;
    const tryFocus = () => {
      if (focusStylePicker(document.querySelector(regionSelector("inspector")) ?? document)) return;
      if (++attempts < STYLE_FOCUS_ATTEMPTS) requestAnimationFrame(tryFocus);
      else focusRegion("inspector");
    };
    requestAnimationFrame(tryFocus);
  };

  const shortcutTooltip = (label: string, combo: string) => (
    <span className="flex items-center gap-1.5">
      {label} <Kbd>{combo}</Kbd>
    </span>
  );

  return (
    <div
      role="group"
      aria-label={t.topBar.label}
      className={cn(
        "flex min-h-12 flex-wrap items-center gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-3",
        className,
      )}
    >
      <p className="m-0 flex min-w-0 items-center gap-2 ps-1">
        {screenName !== null && (
          <>
            <span className="min-w-0 truncate text-small font-medium text-fg">{screenName}</span>
            {screenKind && (
              <>
                <span className="sr-only">, </span>
                <span className="inline-flex h-5 shrink-0 items-center rounded-chip border border-app bg-white/[0.03] px-1.5 text-caption text-muted">
                  {t.kinds[screenKind]}
                </span>
              </>
            )}
          </>
        )}
      </p>

      <div className="flex justify-center">
        {!narrow && (
          <Segmented
            label={t.topBar.device}
            value={device}
            options={deviceOptions}
            onChange={changeDevice}
            layoutId={deviceLayoutId}
            size="md"
          />
        )}
      </div>

      <div className="ms-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5">
        {!narrow && (
          <Tooltip content={t.topBar.structureHint} side="bottom">
            <Chip
              selected={showStructure}
              onSelectedChange={(next) => actions.toggleStructure(next)}
              leading={<StructureIcon className="size-3.5" />}
            >
              {t.topBar.structure}
            </Chip>
          </Tooltip>
        )}
        <span aria-hidden className="mx-0.5 h-5 w-px bg-white/10" />
        <IconButton
          size="sm"
          label={t.topBar.undo}
          tooltip={shortcutTooltip(t.topBar.undo, keys.combo(keys.mod, "Z"))}
          tooltipSide="bottom"
          icon={<UndoIcon />}
          disabled={!history.canUndo}
          onClick={undo}
        />
        <IconButton
          size="sm"
          label={t.topBar.redo}
          tooltip={shortcutTooltip(t.topBar.redo, keys.combo(keys.shift, keys.mod, "Z"))}
          tooltipSide="bottom"
          icon={<RedoIcon />}
          disabled={!history.canRedo}
          onClick={redo}
        />
        <ShortcutsMenu />
        <span aria-hidden className="mx-0.5 h-5 w-px bg-white/10" />
        <Tooltip content={t.topBar.styleHint} side="bottom">
          <Chip onClick={goToStyle} className="max-w-[16rem] min-w-0">
            <span className="min-w-0 truncate">{t.topBar.styleChip(currentStyle)}</span>
          </Chip>
        </Tooltip>
      </div>
    </div>
  );
}
