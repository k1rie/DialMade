"use client";

import type { PageKey } from "@dialmade/doc";
import { useDragDropMonitor } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { sectionRegistry } from "@dialmade/sections";
import { useCallback } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { PanelSection } from "@/components/ui/PanelSection";
import { useDesignDocActions, useDesignDocStore } from "@/hooks/useDesignDoc";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import { DND } from "../../constants";
import { childrenOps, hiddenOps, isHidden, moveOps, pageTarget, sectionContainerOf, sectionRows, type PageTarget } from "../../pageOps";
import { sectionInfo } from "../../sectionInfo";
import { usePlatformKeys } from "@/hooks/usePlatformKeys";
import { SectionRow } from "./SectionRow";

export type SectionListProps = {
  /** The page shown (a page kind's page or a screen's). */
  target: PageTarget;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/**
 * The page's sections in order: select, show/hide and reorder (drag the grip, or ⌥↑/⌥↓). On the App
 * page the rows are the widgets inside the shell, which gets its own row. On a screen the rows are its
 * blocks in reading order (the frame of an app screen gets its own row); the order and the size change in
 * «Layout», so there is no reordering here.
 */
export function SectionList({ target, selectedId, onSelect }: SectionListProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const actions = useDesignDocActions();
  const store = useDesignDocStore();
  const announce = useDndAnnounce();
  const keys = usePlatformKeys();
  const { key, page, screen } = target;

  /** The page as the store has it now (handlers run after renders). */
  const current = useCallback((pageKey: PageKey) => {
    const doc = store.getState().doc;
    return doc ? pageTarget(doc, pageKey) : null;
  }, [store]);

  const announcePosition = useCallback(
    (id: string) => {
      const live = current(key)?.page;
      if (!live) return;
      const container = live.elements[sectionContainerOf(live, sectionRegistry)];
      const index = container?.children.indexOf(id) ?? -1;
      if (index < 0 || !container) return;
      const label = sectionInfo(live, id, locale).label;
      // After the DnD announcer's own «dropped» message.
      setTimeout(() => announce(t.sections.position(label, index + 1, container.children.length)), 80);
    },
    [current, key, locale, announce, t],
  );

  useDragDropMonitor({
    onDragEnd(event) {
      const { source } = event.operation;
      if (event.canceled || !source || !isSortable(source) || source.type !== DND.section) return;
      const from = source.initialIndex;
      const to = source.index;
      const live = current(key);
      if (from === to || !live || live.screen) return;
      const containerId = sectionContainerOf(live.page, sectionRegistry);
      const children = [...(live.page.elements[containerId]?.children ?? [])];
      const [moved] = children.splice(from, 1);
      if (moved === undefined || to < 0 || to > children.length) return;
      children.splice(to, 0, moved);
      if (actions.applyPatch(childrenOps(key, containerId, children)).ok) announcePosition(moved);
    },
  });

  const onMove = useCallback(
    (id: string, delta: -1 | 1) => {
      const live = current(key);
      const ops = live && !live.screen ? moveOps(key, live.page, id, delta) : null;
      if (ops && actions.applyPatch(ops).ok) announcePosition(id);
    },
    [current, key, actions, announcePosition],
  );

  const onToggleHidden = useCallback(
    (id: string, hide: boolean) => {
      const live = current(key);
      if (live) actions.applyPatch(hiddenOps(live, id, hide));
    },
    [current, key, actions],
  );

  const { containerId, ids, reorderable } = sectionRows(target, sectionRegistry);
  const container = containerId ? sectionInfo(page, containerId, locale, screen) : null;
  const hint = reorderable ? t.sections.hint(keys.combo(keys.alt, "↑"), keys.combo(keys.alt, "↓")) : t.sections.layoutHint;

  return (
    <PanelSection title={t.sections.title} hint={hint}>
      {container && containerId && (
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
      {ids.length === 0 ? (
        <p className="text-small text-muted">{t.sections.empty}</p>
      ) : (
        <ul role="list" className="flex flex-col gap-0.5">
          {ids.map((id, index) => {
            const info = sectionInfo(page, id, locale, screen);
            return (
              <SectionRow
                key={id}
                id={id}
                index={index}
                label={info.label}
                detail={info.variantLabel}
                hidden={isHidden(page, id)}
                selected={selectedId === id}
                reorderable={reorderable}
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
