"use client";

import type { BlockId, ScreenId } from "@dialmade/layout";
import { useId, type ChangeEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { useLayoutActions, useLayoutStore } from "../../useLayoutStore";
import { FIELD_HINT, FIELD_SELECT } from "../../fieldStyles";

export type LinkFieldProps = {
  blockId: BlockId;
  linkTo: ScreenId | undefined;
  screenId: ScreenId;
  /** Accessible name of the select (the section title). */
  label: string;
};

/** «Enlaza a»: another screen of the project (preview navigation and export), or none. */
export function LinkField({ blockId, linkTo, screenId, label }: LinkFieldProps) {
  const t = useDictionary(layout);
  const id = useId();
  const actions = useLayoutActions();
  // Only ids and names (shallow-compared): a block edit on another screen does not re-render this select.
  const others = useLayoutStore(useShallow((state) => state.screenOrder.filter((other) => other !== screenId && state.screens[other])));
  const nameList = useLayoutStore(useShallow((state) => others.map((other) => state.screens[other]?.name ?? other)));

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    actions.updateBlock(blockId, { linkTo: value || undefined }, screenId);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <select
        id={id}
        aria-label={label}
        aria-describedby={`${id}-hint`}
        value={linkTo && others.includes(linkTo) ? linkTo : ""}
        onChange={onChange}
        disabled={others.length === 0 && !linkTo}
        className={FIELD_SELECT}
      >
        <option value="">{t.inspector.linkNone}</option>
        {others.map((other, index) => (
          <option key={other} value={other}>
            {nameList[index]}
          </option>
        ))}
      </select>
      <p id={`${id}-hint`} className={FIELD_HINT}>
        {t.inspector.linkHint}
      </p>
    </div>
  );
}
