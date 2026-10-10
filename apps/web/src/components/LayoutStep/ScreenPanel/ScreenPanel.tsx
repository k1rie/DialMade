"use client";

import { getBlockDef, isLibraryBlockType, LABEL_MAX, type AppNav, type ScreenKind } from "@dialmade/layout";
import { useId, useMemo } from "react";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Button } from "@/components/ui/Button";
import { PanelSection } from "@/components/ui/PanelSection";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { REGION_AUTOFOCUS_ATTR } from "../constants";
import { StylePicker } from "../StylePicker";
import { useActiveScreen, useLayoutActions } from "../useLayoutStore";
import { RouteField } from "./RouteField";
import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL } from "../fieldStyles";
import { useFieldDraft } from "../useFieldDraft";

export type ScreenPanelProps = { className?: string };

const NAV_ORDER: readonly AppNav[] = ["sidebar", "rail", "topnav", "none"];

/** «Web pública» → «web pública», to read inside «Convertir en …». */
const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase() + text.slice(1);

/**
 * Right panel while no block is selected: the active screen (name, route, kind and its conversion), its
 * navigation frame when it is an app screen (shared by every app screen) and the style picker. Lives
 * inside the inspector area of LayoutStep (which owns the landmark and F6).
 */
export function ScreenPanel({ className }: ScreenPanelProps) {
  const t = useDictionary(layout);
  const id = useId();
  const screen = useActiveScreen();
  const actions = useLayoutActions();
  const announce = useDndAnnounce({ politeness: "polite" });

  const name = useFieldDraft(`${screen?.id ?? ""}:name`, screen?.name ?? "", (text) => {
    if (screen && text.trim()) actions.renameScreen(screen.id, text);
  });

  // Converting to app turns this screen's navbar/sidebar blocks into the navigation frame: say so first.
  const hasFrameBlocks = useMemo(
    () =>
      screen !== null &&
      Object.values(screen.layout.blocks).some((block) => isLibraryBlockType(block.type) && getBlockDef(block.type).frame !== null),
    [screen],
  );

  const navOptions = useMemo<SegmentedOption<AppNav>[]>(() => NAV_ORDER.map((nav) => ({ value: nav, label: t.nav[nav] })), [t]);

  if (!screen) return null;
  const other: ScreenKind = screen.kind === "app" ? "landing" : "app";
  const blockCount = Object.keys(screen.layout.blocks).length;

  const convert = () => {
    if (!actions.convertScreen(screen.id, other)) return;
    // «Deshacer» undoes this conversion only: after any other change it says so instead of undoing that one.
    const token = actions.changeToken();
    const undoConvert = () => {
      if (actions.undoIfLatest(token)) announce(t.announce.undone);
      else toast(t.common.undoStale);
    };
    const message = t.announce.kindChanged(t.kinds[other]);
    announce(message);
    toast(message, { action: { label: t.common.undo, onClick: undoConvert } });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <PanelSection semantics="group" title={t.screenPanel.title} hint={t.screenPanel.blocks(blockCount)}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-name`} className={FIELD_LABEL}>
            {t.screenPanel.name}
          </label>
          <input
            id={`${id}-name`}
            {...{ [REGION_AUTOFOCUS_ATTR]: "" }}
            type="text"
            value={name.value}
            maxLength={LABEL_MAX}
            autoComplete="off"
            spellCheck={false}
            onChange={name.onChange}
            onBlur={name.onBlur}
            onKeyDown={name.onKeyDown}
            className={cn(FIELD_CONTROL, "h-8")}
          />
        </div>

        <RouteField screenId={screen.id} route={screen.route} />

        <div className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>{t.screenPanel.kind}</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-chip border border-app bg-white/[0.04] px-2 py-0.5 text-caption text-fg">{t.kinds[screen.kind]}</span>
            <Button size="sm" onClick={convert} aria-describedby={`${id}-convert`}>
              {t.screenPanel.convert(lowerFirst(t.kinds[other]))}
            </Button>
          </div>
          <p id={`${id}-convert`} className={FIELD_HINT}>
            {other === "app" && hasFrameBlocks ? t.screenPanel.convertToAppHint : t.screenPanel.convertHint}
          </p>
        </div>
      </PanelSection>

      {screen.kind === "app" && screen.shell && (
        <PanelSection semantics="group" title={t.screenPanel.navigation} hint={t.screenPanel.navigationHint}>
          <div className="flex flex-col gap-1.5">
            {/* Four Spanish labels nearly fill an 18rem panel: overflow scrolls here, never the whole inspector. */}
            <div className="-mx-1 overflow-x-auto px-1 py-1 scrollbar-none">
              <Segmented
                accentBar
                label={t.screenPanel.navigation}
                layoutId={`${id}-nav`}
                size="sm"
                value={screen.shell.nav}
                options={navOptions}
                onChange={(nav) => actions.setShell(screen.id, { nav })}
              />
            </div>
            <p className={FIELD_HINT}>{t.navHints[screen.shell.nav]}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Switch
              size="sm"
              checked={screen.shell.header}
              onCheckedChange={(header) => actions.setShell(screen.id, { header })}
              label={t.screenPanel.pageHeader}
              aria-describedby={`${id}-header`}
            />
            <p id={`${id}-header`} className={cn(FIELD_HINT, "ps-[2.375rem]")}>
              {t.screenPanel.pageHeaderHint}
            </p>
          </div>
        </PanelSection>
      )}

      <StylePicker />
    </div>
  );
}
