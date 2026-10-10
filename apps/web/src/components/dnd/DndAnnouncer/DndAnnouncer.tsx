"use client";

import { useDragDropMonitor } from "@dnd-kit/react";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { DND_INSTRUCTIONS_ID, labelOf } from "@/lib/dnd";
import { DndAnnounceContext } from "./context";

/**
 * Single aria-live region for drag and drop (pick up, over, drop, cancel) plus the hidden
 * instructions referenced by every DraggableItem. Must live inside the DragDropProvider.
 */
export function DndAnnouncer({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const flip = useRef(false);
  const lastOver = useRef<string | number | null>(null);

  const announce = useCallback((next: string) => {
    flip.current = !flip.current;
    // A trailing zero-width space lets screen readers repeat an identical message.
    setMessage(flip.current ? next : `${next}​`);
  }, []);

  useDragDropMonitor({
    onDragStart(event) {
      lastOver.current = null;
      announce(t.dnd.pickedUp(labelOf(event.operation.source)));
    },
    onDragOver(event) {
      const { source, target } = event.operation;
      const targetId = target?.id ?? null;
      if (targetId === lastOver.current) return;
      lastOver.current = targetId;
      const item = labelOf(source);
      announce(target ? t.dnd.over(item, labelOf(target)) : t.dnd.notOver(item));
    },
    onDragEnd(event) {
      const { source, target } = event.operation;
      const item = labelOf(source);
      announce(!event.canceled && target ? t.dnd.dropped(item, labelOf(target)) : t.dnd.canceled(item));
    },
  });

  return (
    <DndAnnounceContext.Provider value={announce}>
      {children}
      <p id={DND_INSTRUCTIONS_ID} className="sr-only">
        {t.dnd.instructions}
      </p>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {message}
      </div>
    </DndAnnounceContext.Provider>
  );
}
