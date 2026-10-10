"use client";

import { LABEL_MAX, type BlockId, type ScreenId } from "@dialmade/layout";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { INSPECTOR_NAME_ID, REGION_AUTOFOCUS_ATTR } from "../../constants";
import { useLayoutActions, useLayoutStoreApi } from "../../useLayoutStore";
import { FIELD_CONTROL, FIELD_LABEL } from "../../fieldStyles";
import { useFieldDraft } from "../../useFieldDraft";

export type NameFieldProps = {
  blockId: BlockId;
  label: string;
  screenId: ScreenId;
};

/**
 * «Nombre» (one line, ≤60). The F2 target of the canvas (`INSPECTOR_NAME_ID`) and where F6 lands in the
 * inspector. Applies on blur or Enter; an empty name is refused and the stored one comes back.
 */
export function NameField({ blockId, label, screenId }: NameFieldProps) {
  const t = useDictionary(layout);
  const actions = useLayoutActions();
  const store = useLayoutStoreApi();
  const announce = useDndAnnounce({ politeness: "polite" });

  const field = useFieldDraft(`${screenId}:${blockId}:label`, label, (text) => {
    if (!text.trim()) return;
    if (!actions.updateBlock(blockId, { label: text }, screenId).changed) return;
    const saved = store.getState().screens[screenId]?.layout.blocks[blockId]?.label;
    if (saved) announce(t.announce.renamed(saved));
  });

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={INSPECTOR_NAME_ID} className={FIELD_LABEL}>
        {t.inspector.name}
      </label>
      <input
        id={INSPECTOR_NAME_ID}
        {...{ [REGION_AUTOFOCUS_ATTR]: "" }}
        type="text"
        value={field.value}
        maxLength={LABEL_MAX}
        autoComplete="off"
        spellCheck={false}
        onChange={field.onChange}
        onBlur={field.onBlur}
        onKeyDown={field.onKeyDown}
        className={cn(FIELD_CONTROL, "h-8")}
      />
    </div>
  );
}
