"use client";

import {
  BLOCK_CATEGORIES,
  blocksInCategory,
  isLibraryBlockType,
  type BlockId,
  type LayoutBlock,
  type LibraryBlockDef,
  type ScreenId,
  type ScreenKind,
} from "@dialmade/layout";
import { useId, type ChangeEvent } from "react";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { useDictionary } from "@/i18n";
import { layout, type LayoutDictionary } from "@/i18n/layout";
import { useLayoutActions, useLayoutEnv, useLayoutStoreApi } from "../../useLayoutStore";
import { FIELD_HINT, FIELD_LABEL, FIELD_SELECT } from "../../fieldStyles";

export type TypeFieldProps = {
  blockId: BlockId;
  block: LayoutBlock;
  screenId: ScreenId;
  kind: ScreenKind;
};

type Option = { def: LibraryBlockDef; label: string; disabled: boolean };

/**
 * Options of a category with their remark: «Pronto»; a sidebar on a landing is «Solo en pantallas de app»;
 * on an app screen navbar and sidebar are the navigation frame, chosen in the screen panel. Those two are
 * disabled: with the keyboard a closed select changes on every arrow (Windows), and passing over Navbar
 * must not turn the block into the navigation.
 */
function optionsOf(defs: readonly LibraryBlockDef[], kind: ScreenKind, t: LayoutDictionary): Option[] {
  return defs.map((def) => {
    const appOnly = kind === "landing" && def.frame === "sidebar";
    const frame = kind === "app" && def.frame !== null;
    const remark = appOnly ? t.library.appOnly : frame ? t.inspector.frameRemark : def.status === "soon" ? t.library.soon : null;
    return { def, label: t.inspector.typeOption(t.blocks[def.type].name, remark), disabled: appOnly || frame };
  });
}

/**
 * «Tipo»: every library type grouped by category. A change keeps the geometry and renames a default label.
 * Should the store still turn the block into the navigation frame, the block goes away with «Deshacer».
 */
export function TypeField({ blockId, block, screenId, kind }: TypeFieldProps) {
  const t = useDictionary(layout);
  const id = useId();
  const actions = useLayoutActions();
  const store = useLayoutStoreApi();
  const { focusRegion } = useLayoutEnv();
  const announce = useDndAnnounce({ politeness: "polite" });

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const type = event.target.value;
    if (!isLibraryBlockType(type) || type === block.type) return;
    const outcome = actions.updateBlock(blockId, { type }, screenId);
    if (outcome.nav) {
      // «Deshacer» undoes this change only: after any other change it says so instead of undoing that one.
      const token = actions.changeToken();
      const undoFrame = () => {
        if (actions.undoIfLatest(token)) announce(t.announce.undone);
        else toast(t.common.undoStale);
      };
      const message = t.whatIsThis.frameChosen(t.nav[outcome.nav]);
      announce(message);
      toast(message, { action: { label: t.common.undo, onClick: undoFrame } });
      // The block is gone (and this select with it): keep focus in the inspector.
      requestAnimationFrame(() => focusRegion("inspector"));
      return;
    }
    if (!outcome.changed) return;
    const label = store.getState().screens[screenId]?.layout.blocks[blockId]?.label ?? block.label;
    announce(t.announce.typeChanged(label, t.blocks[type].name));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={FIELD_LABEL}>
        {t.inspector.type}
      </label>
      <select id={id} value={block.type} onChange={onChange} aria-describedby={`${id}-hint`} className={FIELD_SELECT}>
        {BLOCK_CATEGORIES.map((category) => (
          <optgroup key={category} label={t.categories[category]}>
            {optionsOf(blocksInCategory(category), kind, t).map(({ def, label, disabled }) => (
              <option key={def.type} value={def.type} disabled={disabled && def.type !== block.type}>
                {label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <p id={`${id}-hint`} className={FIELD_HINT}>
        {t.inspector.typeHint}
      </p>
    </div>
  );
}
