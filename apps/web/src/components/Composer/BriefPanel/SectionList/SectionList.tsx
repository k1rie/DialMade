"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { useDragDropMonitor } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { sectionRegistry } from "@dialmade/sections";
import { useCallback } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { useDesignDocActions, useDesignDocStore } from "@/hooks/useDesignDoc";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import { DND } from "../../constants";
import { childrenOps, hiddenOps, isHidden, moveOps, sectionContainerOf } from "../../pageOps";
import { PanelSection } from "../../PanelSection";
import { sectionInfo } from "../../sectionInfo";
import { usePlatformKeys } from "@/hooks/usePlatformKeys";
import { SectionRow } from "./SectionRow";

export type SectionListProps = {
  doc: DesignDoc;
  kind: OutputKind;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/**
 * The page's sections in order: select, show/hide and reorder (drag the grip, or ⌥↑/⌥↓). On the App
 * page the rows are the widgets inside the shell, which gets its own row.
 */
export function SectionList({ doc, kind, selectedId, onSelect }: SectionListProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const actions = useDesignDocActions();
  const store = useDesignDocStore();
  const announce = useDndAnnounce();
  const keys = usePlatformKeys();
  const page = doc.pages[kind];

  const announcePosition = useCallback(
    (id: string) => {
      const current = store.getState().doc?.pages[kind];
      if (!current) return;
      const container = current.elements[sectionContainerOf(current, sectionRegistry)];
      const index = container?.children.indexOf(id) ?? -1;
      if (index < 0 || !container) return;
      const label = sectionInfo(current, id, locale).label;
      // After the DnD announcer's own «dropped» message.
      setTimeout(() => announce(t.sections.position(label, index + 1, container.children.length)), 80);
    },
    [store, kind, locale, announce, t],
  );

  useDragDropMonitor({
    onDragEnd(event) {
      const { source } = event.operation;
      if (event.canceled || !source || !isSortable(source) || source.type !== DND.section) return;
      const from = source.initialIndex;
      const to = source.index;
      const current = store.getState().doc?.pages[kind];
      if (from === to || !current) return;
      const containerId = sectionContainerOf(current, sectionRegistry);
      const children = [...(current.elements[containerId]?.children ?? [])];
      const [moved] = children.splice(from, 1);
      if (moved === undefined || to < 0 || to > children.length) return;
      children.splice(to, 0, moved);
      if (actions.applyPatch(childrenOps(kind, containerId, children)).ok) announcePosition(moved);
    },
  });

  const onMove = useCallback(
    (id: string, delta: -1 | 1) => {
      const current = store.getState().doc?.pages[kind];
      const ops = current && moveOps(kind, current, id, delta);
      if (ops && actions.applyPatch(ops).ok) announcePosition(id);
    },
    [store, kind, actions, announcePosition],
  );

  const onToggleHidden = useCallback(
    (id: string, hide: boolean) => {
      const current = store.getState().doc?.pages[kind];
      if (current) actions.applyPatch(hiddenOps(kind, current, id, hide));
    },
    [store, kind, actions],
  );

  if (!page) return null;
  const containerId = sectionContainerOf(page, sectionRegistry);
  const children = page.elements[containerId]?.children ?? [];
  const container = containerId !== page.root ? sectionInfo(page, containerId, locale) : null;

  return (
    <PanelSection title={t.sections.title} hint={t.sections.hint(keys.combo(keys.alt, "↑"), keys.combo(keys.alt, "↓"))}>
      {container && (
        <button
          type="button"
          aria-current={selectedId === containerId || undefined}
          onClick={() => onSelect(containerId)}
          className={cn(
            "flex flex-col items-start rounded-control border px-3 py-1.5 text-start transition-colors",
            selectedId === containerId ? "glow-purple border-transparent bg-accent-soft/30" : "border-app hover:border-app-strong",
          )}
        >
          <span className="text-caption text-muted">{t.sections.container}</span>
          <span className="text-small text-fg">
            {container.label}
            {container.variantLabel && <span className="text-muted"> · {container.variantLabel}</span>}
          </span>
        </button>
      )}
      {children.length === 0 ? (
        <p className="text-small text-muted">{t.sections.empty}</p>
      ) : (
        <ul role="list" className="flex flex-col gap-0.5">
          {children.map((id, index) => {
            const info = sectionInfo(page, id, locale);
            return (
              <SectionRow
                key={id}
                id={id}
                index={index}
                label={info.label}
                detail={info.variantLabel}
                hidden={isHidden(page, id)}
                selected={selectedId === id}
                onSelect={onSelect}
                onToggleHidden={onToggleHidden}
                onMove={onMove}
              />
            );
          })}
        </ul>
      )}
    </PanelSection>
  );
}
