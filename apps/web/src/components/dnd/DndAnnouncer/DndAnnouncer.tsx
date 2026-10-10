"use client";

import { useDragDropMonitor } from "@dnd-kit/react";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { DND_INSTRUCTIONS_ID, labelOf } from "@/lib/dnd";
import { DndAnnounceContext, type DndPoliteness } from "./context";
import { nextLiveMessage } from "./liveMessage";

/**
 * The aria-live regions for drag and drop plus the hidden instructions referenced by every DraggableItem.
 * Must live inside the DragDropProvider.
 * - `assertive`: the drag itself (pick up, over, drop, cancel) and errors.
 * - `polite`: confirmations of a click or keyboard alternative («Calendario añadido…»), which must not cut
 *   off what the screen reader is saying.
 */
export function DndAnnouncer({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Readonly<Record<DndPoliteness, string>>>({ polite: "", assertive: "" });
  const lastOver = useRef<string | number | null>(null);

  const announce = useCallback((next: string, politeness: DndPoliteness) => {
    setMessages((current) => ({ ...current, [politeness]: nextLiveMessage(current[politeness], next) }));
  }, []);

  useDragDropMonitor({
    onDragStart(event) {
      lastOver.current = null;
      announce(t.dnd.pickedUp(labelOf(event.operation.source)), "assertive");
    },
    onDragOver(event) {
      const { source, target } = event.operation;
      const targetId = target?.id ?? null;
      if (targetId === lastOver.current) return;
      lastOver.current = targetId;
      const item = labelOf(source);
      announce(target ? t.dnd.over(item, labelOf(target)) : t.dnd.notOver(item), "assertive");
    },
    onDragEnd(event) {
      const { source, target } = event.operation;
      const item = labelOf(source);
      announce(!event.canceled && target ? t.dnd.dropped(item, labelOf(target)) : t.dnd.canceled(item), "assertive");
    },
  });

  return (
    <DndAnnounceContext.Provider value={announce}>
      {children}
      <p id={DND_INSTRUCTIONS_ID} className="sr-only">
        {t.dnd.instructions}
      </p>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {messages.assertive}
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {messages.polite}
      </div>
    </DndAnnounceContext.Provider>
  );
}
