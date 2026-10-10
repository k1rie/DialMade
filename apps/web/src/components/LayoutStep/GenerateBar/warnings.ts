import type { LayoutDoc, LayoutFix, LayoutWarning, LayoutWarningCode, ScreenId, Structure } from "@dialmade/layout";

/*
 * Warnings of the layout as rows of the warnings list: the message parts (block names in `warning.ids`
 * order, which the i18n messages expect) and the one-click fixes with the name of the block they act on.
 */

export type WarningFixItem = { key: string; fix: LayoutFix; blockName: string };

export type WarningItem = {
  key: string;
  code: LayoutWarningCode;
  /** Labels of `warning.ids`, in order (the block first, then its container). */
  names: string[];
  fixes: WarningFixItem[];
};

export type WarningGroup = { screenId: ScreenId; screenName: string; items: WarningItem[] };

/** A screen as the warnings list needs it. */
export type WarningSource = { id: ScreenId; name: string; layout: LayoutDoc };

const nameOf = (layout: LayoutDoc, id: string) => layout.blocks[id]?.label ?? id;

/** Rows of a screen's warnings. Keys are stable for the same warning and unique within the list. */
export function warningItems(warnings: readonly LayoutWarning[], layout: LayoutDoc): WarningItem[] {
  const seen = new Map<string, number>();
  return warnings.map((warning) => {
    const base = `${warning.code}:${warning.ids.join("+")}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return {
      key: n === 0 ? base : `${base}#${n}`,
      code: warning.code,
      names: warning.ids.map((id) => nameOf(layout, id)),
      fixes: warning.fixes.map((fix, index) => ({ key: `${fix.kind}:${fix.id}:${index}`, fix, blockName: nameOf(layout, fix.id) })),
    };
  });
}

/**
 * Warnings of every screen that has some, grouped by screen in project order, with `firstId` (the
 * active screen) first.
 */
export function warningGroups(
  screens: readonly WarningSource[],
  structureOf: (layout: LayoutDoc) => Structure,
  firstId: ScreenId | null = null,
): WarningGroup[] {
  const groups: WarningGroup[] = [];
  for (const screen of screens) {
    const { warnings } = structureOf(screen.layout);
    if (warnings.length === 0) continue;
    const group = { screenId: screen.id, screenName: screen.name, items: warningItems(warnings, screen.layout) };
    if (screen.id === firstId) groups.unshift(group);
    else groups.push(group);
  }
  return groups;
}

/**
 * Where focus goes after the row at `index` was fixed and the list now has `length` rows: the row that
 * took its place, else the new last one; `-1` when the list is empty.
 */
export const focusIndexAfterFix = (index: number, length: number): number => (length === 0 ? -1 : Math.min(Math.max(0, index), length - 1));
