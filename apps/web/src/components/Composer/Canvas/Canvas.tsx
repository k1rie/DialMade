"use client";

import type { DesignDoc } from "@dialmade/doc";
import { useId } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { useDesignDocActions, type PreviewDevice } from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { useDictionary } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import { DEVICE_ORDER } from "@/lib/devices";
import type { DroppedItem } from "@/lib/dnd";
import { MonitorIcon, MoonIcon, PhoneIcon, SunIcon, TabletIcon } from "../icons";
import type { PageTarget } from "../pageOps";
import { CanvasViewport, type CanvasViewportProps } from "./CanvasViewport";
import { PageTabs } from "./PageTabs";

export type CanvasProps = {
  doc: DesignDoc;
  /** The page shown: a page kind's page or a screen's. */
  target: PageTarget;
  labelOf: (target: Pick<PageTarget, "kind" | "screen">) => string;
  mode: PreviewMode;
  device: PreviewDevice;
  logoUrl: string | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  revealKey: number;
  onDrop: (item: DroppedItem) => void;
  toolbar: CanvasViewportProps["toolbar"];
  className?: string;
};

const DEVICE_ICONS = { mobile: <PhoneIcon />, tablet: <TabletIcon />, desktop: <MonitorIcon /> } as const;

/** Center column: page tabs, device and color mode, and the live page in its frame. */
export function Canvas({ doc, target, labelOf, mode, device, logoUrl, selectedId, onSelect, onDeselect, revealKey, onDrop, toolbar, className }: CanvasProps) {
  const t = useDictionary(composer);
  const actions = useDesignDocActions();
  const regionId = useId();

  return (
    <section aria-label={t.canvas.label(labelOf(target))} className={cn("flex min-h-0 min-w-0 flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2 max-sm:flex-wrap">
        <PageTabs doc={doc} active={target.key} labelOf={labelOf} controls={regionId} />
        <div className="flex shrink-0 items-center gap-1.5">
          <Segmented
            label={t.canvas.device}
            layoutId="composer-device"
            value={device}
            onChange={actions.setDevice}
            options={DEVICE_ORDER.map((value) => ({ value, label: t.canvas.devices[value], icon: DEVICE_ICONS[value], iconOnly: true }))}
          />
          <Segmented
            label={t.canvas.mode}
            layoutId="composer-mode"
            value={mode}
            onChange={actions.setPreviewMode}
            options={[
              { value: "light", label: t.canvas.light, icon: <SunIcon />, iconOnly: true },
              { value: "dark", label: t.canvas.dark, icon: <MoonIcon />, iconOnly: true },
            ]}
          />
        </div>
      </div>
      <CanvasViewport
        id={regionId}
        label={t.canvas.label(labelOf(target))}
        doc={doc}
        target={target}
        mode={mode}
        device={device}
        logoUrl={logoUrl}
        selectedId={selectedId}
        onSelect={onSelect}
        onDeselect={onDeselect}
        revealKey={revealKey}
        onDrop={onDrop}
        toolbar={toolbar}
      />
    </section>
  );
}
