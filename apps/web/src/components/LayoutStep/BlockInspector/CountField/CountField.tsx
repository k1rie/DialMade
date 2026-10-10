"use client";

import { parseNote, type BlockId, type LayoutBlock, type LibraryBlockDef, type ScreenId } from "@dialmade/layout";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { IconButton } from "@/components/ui/IconButton";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { MinusIcon, PlusIcon } from "../../icons";
import { useLayoutActions } from "../../useLayoutStore";
import { parseCount } from "../fields";
import { NumberField } from "../NumberField";

export type CountFieldProps = {
  blockId: BlockId;
  block: LayoutBlock;
  /** Bounds of a repeatable block (`def.repeatable`). */
  repeatable: NonNullable<LibraryBlockDef["repeatable"]>;
  screenId: ScreenId;
};

/** What the block will repeat: its ×N, else a number in the note («3 planes»), else the default, within bounds. */
function effectiveCount(block: LayoutBlock, bounds: CountFieldProps["repeatable"]): number {
  const raw = block.count ?? parseNote(block.note).count ?? bounds.default;
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(raw)));
}

/** «Cantidad» of a repeatable block: −/+ buttons (one undo step each) and a number field. */
export function CountField({ blockId, block, repeatable, screenId }: CountFieldProps) {
  const t = useDictionary(layout);
  const actions = useLayoutActions();
  const announce = useDndAnnounce({ politeness: "polite" });
  const value = effectiveCount(block, repeatable);

  const set = (count: number) => {
    if (actions.updateBlock(blockId, { count }, screenId).changed) announce(t.announce.countChanged(block.label, count));
  };
  const step = (delta: number) => {
    const next = value + delta;
    if (next >= repeatable.min && next <= repeatable.max) set(next);
  };

  // aria-disabled instead of disabled: focus stays on the button when it reaches the limit.
  const atMin = value <= repeatable.min;
  const atMax = value >= repeatable.max;
  return (
    <NumberField
      draftKey={`${screenId}:${blockId}:count`}
      label={t.inspector.count}
      value={value}
      min={repeatable.min}
      max={repeatable.max}
      step={1}
      hint={t.inspector.countHint(repeatable.min, repeatable.max)}
      onCommit={(raw) => {
        const count = parseCount(raw, repeatable);
        if (count !== null && count !== value) set(count);
      }}
      before={
        <IconButton
          size="sm"
          variant="secondary"
          label={t.inspector.decrease}
          icon={<MinusIcon />}
          aria-disabled={atMin || undefined}
          onClick={() => step(-1)}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
        />
      }
      after={
        <IconButton
          size="sm"
          variant="secondary"
          label={t.inspector.increase}
          icon={<PlusIcon />}
          aria-disabled={atMax || undefined}
          onClick={() => step(1)}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
        />
      }
    />
  );
}
