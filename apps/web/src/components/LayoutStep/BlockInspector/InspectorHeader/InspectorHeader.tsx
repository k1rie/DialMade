"use client";

import type { BlockId, LayoutBlock, LibraryBlockDef, ScreenId } from "@dialmade/layout";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { IconButton } from "@/components/ui/IconButton";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { BlockIcon, DuplicateIcon, EyeIcon, EyeOffIcon, TrashIcon } from "../../icons";
import { useLayoutActions, useLayoutEnv } from "../../useLayoutStore";

export type InspectorHeaderProps = {
  blockId: BlockId;
  block: LayoutBlock;
  /** Library metadata of the block's type («Bloque libre» for an unknown type). */
  def: LibraryBlockDef;
  screenId: ScreenId;
  /** Id of the heading, so the inspector content can be labelled by it. */
  headingId: string;
};

/** Block type with its icon («Pronto» when it is a placeholder) and the duplicate · hide · delete actions. */
export function InspectorHeader({ blockId, block, def, screenId, headingId }: InspectorHeaderProps) {
  const t = useDictionary(layout);
  const actions = useLayoutActions();
  const { focusRegion } = useLayoutEnv();
  const announce = useDndAnnounce({ politeness: "polite" });
  const hidden = block.hidden === true;

  const duplicate = () => {
    // The copy is selected: the inspector stays, now on the copy, with focus on this button.
    if (actions.duplicateBlock(blockId, screenId)) announce(t.announce.duplicated(block.label));
  };

  const toggleHidden = () => {
    const { changed } = actions.updateBlock(blockId, { hidden: !hidden }, screenId);
    if (changed) announce(hidden ? t.announce.shown(block.label) : t.announce.hidden(block.label));
  };

  const remove = () => {
    const removed = actions.removeBlocks([blockId], screenId);
    if (removed.length === 0) return;
    // «Deshacer» undoes this removal only: after any other change it says so instead of undoing that change.
    const token = actions.changeToken();
    const undoRemoval = () => {
      if (actions.undoIfLatest(token)) announce(t.announce.undone);
      else toast(t.common.undoStale);
    };
    const message = removed.length > 1 ? t.announce.removedMany(removed.length) : t.announce.removed(block.label);
    announce(message);
    toast(message, { action: { label: t.common.undo, onClick: undoRemoval } });
    // This button unmounts with the selection: keep focus in the inspector (now the screen panel).
    requestAnimationFrame(() => focusRegion("inspector"));
  };

  return (
    <header className="flex items-start gap-3">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-control border border-app bg-white/[0.03] text-muted [&_svg]:size-[18px]"
      >
        <BlockIcon type={def.type} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        {/* tabIndex -1: focus lands here when the last warning is fixed (its button goes away). */}
        <h2 id={headingId} tabIndex={-1} className="truncate text-small font-semibold text-fg">
          {t.blocks[def.type].name}
        </h2>
        {def.status === "soon" && (
          <span className="w-fit rounded-chip border border-app bg-white/[0.04] px-1.5 text-caption text-muted">{t.canvas.soon}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton size="sm" label={t.screens.duplicateLabel(block.label)} tooltip={t.inspector.duplicate} icon={<DuplicateIcon />} onClick={duplicate} />
        <IconButton
          size="sm"
          label={hidden ? t.layers.show(block.label) : t.layers.hide(block.label)}
          tooltip={hidden ? t.inspector.show : t.inspector.hide}
          icon={hidden ? <EyeOffIcon /> : <EyeIcon />}
          onClick={toggleHidden}
        />
        <IconButton
          size="sm"
          label={t.screens.deleteLabel(block.label)}
          tooltip={t.inspector.delete}
          icon={<TrashIcon />}
          onClick={remove}
        />
      </div>
    </header>
  );
}
