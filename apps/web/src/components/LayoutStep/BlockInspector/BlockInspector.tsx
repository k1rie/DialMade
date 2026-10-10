"use client";

import { absorbChildren, estimateContent, getBlockDef, isLibraryBlockType } from "@dialmade/layout";
import { useId, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { PanelSection } from "@/components/ui/PanelSection";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { ExternalLinkIcon, MonitorIcon } from "../icons";
import { useActiveScreen, useLayoutActions, useLayoutStore, useSelectedBlock } from "../useLayoutStore";
import { BlockWarnings } from "./BlockWarnings";
import { VOTE_URL } from "./constants";
import { CountField } from "./CountField";
import { DeviceFields } from "./DeviceFields";
import { FineAdjust } from "./FineAdjust";
import { InspectorHeader } from "./InspectorHeader";
import { LinkField } from "./LinkField";
import { linkFieldMode } from "./linkable";
import { MoveToMenu } from "./MoveToMenu";
import { NameField } from "./NameField";
import { NoteField } from "./NoteField";
import { PositionFields } from "./PositionFields";
import { FIELD_HINT } from "../fieldStyles";
import { TypeField } from "./TypeField";

export type BlockInspectorProps = { className?: string };

/**
 * Right panel while a block is selected: what the block is and says (type, name, note, count), where it
 * sits (numeric position and size, «Ajuste fino», «Mover a…»), where it shows (tablet, mobile, mobile
 * behavior) and where it links (only blocks with a primary action to link, `linkFieldMode`). Nothing aesthetic. Every edit is one undo step; text and numbers apply on
 * blur or Enter. Lives inside the inspector area of LayoutStep (which owns the landmark and F6).
 */
export function BlockInspector({ className }: BlockInspectorProps) {
  const t = useDictionary(layout);
  const headingId = useId();
  const selection = useSelectedBlock();
  const screen = useActiveScreen();
  const device = useLayoutStore((state) => state.device);
  const actions = useLayoutActions();
  const screenLayout = screen?.layout;
  const absorbed = useMemo(() => (screenLayout ? absorbChildren(screenLayout).absorbed : {}), [screenLayout]);

  if (!selection || !screen) return null;
  const { id, block } = selection;
  const def = getBlockDef(isLibraryBlockType(block.type) ? block.type : "free");
  const typeName = t.blocks[def.type].name;
  const estimate = estimateContent(block, screen.layout, id);
  const parent = block.parentId !== undefined ? screen.layout.blocks[block.parentId] : undefined;
  const desktop = device === "desktop";
  const linkMode = linkFieldMode(screen.layout, id, absorbed);

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-4">
        <InspectorHeader blockId={id} block={block} def={def} screenId={screen.id} headingId={headingId} />

        <BlockWarnings blockId={id} layout={screen.layout} screenId={screen.id} fallbackFocusId={headingId} />

        {def.status === "soon" && (
          <div role="note" className="flex flex-col gap-2 rounded-card border border-app bg-white/[0.02] p-3">
            <p className="text-caption text-muted">{t.inspector.soon}</p>
            <a
              href={VOTE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.library.voteLabel(typeName)}
              className="inline-flex w-fit items-center gap-1.5 text-small text-accent underline-offset-4 hover:underline focus-visible:underline [&_svg]:size-3.5"
            >
              {t.library.vote}
              <ExternalLinkIcon />
            </a>
          </div>
        )}

        <TypeField blockId={id} block={block} screenId={screen.id} kind={screen.kind} />
        <NameField blockId={id} label={block.label} screenId={screen.id} />
        <NoteField blockId={id} note={block.note} screenId={screen.id} />
        {def.repeatable && <CountField blockId={id} block={block} repeatable={def.repeatable} screenId={screen.id} />}

        {(estimate || parent || def.frame) && (
          <div className="flex flex-col gap-1.5">
            {estimate && <p className="text-caption text-muted">{t.inspector.generates(t.estimate(estimate))}</p>}
            {parent && block.parentId !== undefined && (
              <p className="flex min-w-0 items-center gap-1 text-caption text-muted">
                <span className="shrink-0">{t.inspector.parent}</span>
                <button
                  type="button"
                  onClick={() => actions.select(block.parentId ?? null)}
                  aria-label={t.inspector.parentSelect(parent.label)}
                  className="min-h-6 min-w-0 truncate rounded-[6px] px-1 font-medium text-fg underline-offset-4 hover:underline"
                >
                  {parent.label}
                </button>
              </p>
            )}
            {def.frame && <p className={FIELD_HINT}>{t.inspector.frameNote}</p>}
          </div>
        )}
      </div>

      <PanelSection semantics="group" title={t.inspector.position} actions={desktop ? <MoveToMenu blockId={id} screenId={screen.id} /> : undefined}>
        {desktop ? (
          <>
            <PositionFields blockId={id} rect={block.rect} screenId={screen.id} />
            <FineAdjust blockId={id} rect={block.rect} screenId={screen.id} />
          </>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className={FIELD_HINT}>{t.inspector.desktopOnly}</p>
            <Button size="sm" leadingIcon={<MonitorIcon />} onClick={() => actions.setDevice("desktop")}>
              {t.canvas.editDesktop}
            </Button>
          </div>
        )}
      </PanelSection>

      <PanelSection semantics="group" title={t.inspector.devices}>
        <DeviceFields blockId={id} block={block} def={def} screenId={screen.id} />
      </PanelSection>

      {linkMode !== "none" && (
        <PanelSection semantics="group" title={t.inspector.linkTo}>
          <LinkField blockId={id} linkTo={block.linkTo} screenId={screen.id} label={t.inspector.linkTo} supported={linkMode === "link"} />
        </PanelSection>
      )}
    </div>
  );
}
