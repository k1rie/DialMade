"use client";

import type { BlockId, GridRect, ScreenId } from "@dialmade/layout";
import { useId } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { useLayoutStoreApi } from "../../useLayoutStore";
import { applyField, fieldBounds, fieldValue, type RectField } from "../fields";
import { NumberField } from "../NumberField";
import { FIELD_HINT } from "../styles";
import { useCommitRect } from "../useCommitRect";

export type PositionFieldsProps = {
  blockId: BlockId;
  rect: GridRect;
  screenId: ScreenId;
};

/**
 * «Columna», «Ancho», «Arriba» and «Alto» (1-based columns, px of the design). Each applies on blur or
 * Enter as one `setRect`, clamped to the grid; the values follow the block while it moves on the canvas.
 */
export function PositionFields({ blockId, rect, screenId }: PositionFieldsProps) {
  const t = useDictionary(layout);
  const pxHintId = useId();
  const store = useLayoutStoreApi();
  const commitRect = useCommitRect();

  const field = (name: RectField, label: string, extra: { unit?: string; hint?: string; describedBy?: string }) => {
    const bounds = fieldBounds(rect, name);
    return (
      <NumberField
        draftKey={`${screenId}:${blockId}:${name}`}
        label={label}
        value={fieldValue(rect, name)}
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        {...extra}
        onCommit={(raw) => {
          // The other three values as they are now (the block may have moved since the typing started).
          const current = store.getState().screens[screenId]?.layout.blocks[blockId]?.rect;
          const next = current ? applyField(current, name, raw) : null;
          if (current && next && next !== current) commitRect(blockId, next, screenId, name === "w" || name === "height" ? "resized" : "moved");
        }}
      />
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-x-2 gap-y-3">
        {field("col", t.inspector.column, { hint: t.inspector.columnHint(fieldBounds(rect, "col").max ?? 12) })}
        {field("w", t.inspector.width, { unit: t.inspector.widthUnit, hint: t.inspector.widthHint(fieldBounds(rect, "w").max ?? 12) })}
        {field("top", t.inspector.top, { unit: t.inspector.pxUnit, describedBy: pxHintId })}
        {field("height", t.inspector.height, { unit: t.inspector.pxUnit, describedBy: pxHintId })}
      </div>
      <p id={pxHintId} className={FIELD_HINT}>
        {t.inspector.pxHint}
      </p>
    </div>
  );
}
