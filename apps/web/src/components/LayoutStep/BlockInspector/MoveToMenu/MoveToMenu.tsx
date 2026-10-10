"use client";

import type { BlockId, ScreenId } from "@dialmade/layout";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { ChevronDownIcon, MoveIcon, NestIcon } from "../../icons";
import { Popover } from "../../Popover";
import { useLayoutActions, useLayoutStore, useLayoutStoreApi } from "../../useLayoutStore";
import { alignRect, moveOptions, parentOf, planMoveTo, type AlignTarget, type MoveTarget } from "../moveTo";
import { useCommitRect } from "../useCommitRect";

export type MoveToMenuProps = {
  blockId: BlockId;
  screenId: ScreenId;
};

const ALIGN_ORDER: readonly AlignTarget[] = ["left", "center", "right", "full"];

const ITEM =
  "flex min-h-8 w-full items-center gap-2 rounded-[8px] px-2 py-1 text-start text-small text-fg transition-colors duration-150 " +
  "hover:bg-white/[0.06] disabled:pointer-events-none disabled:text-subtle [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted";

/**
 * «Mover a…»: the click and keyboard alternative to dragging a block elsewhere (WCAG 2.5.7). Order moves
 * (top, end, into or out of a container) make room and go in one batch, one undo step; alignments are one
 * `setRect`. Options that would change nothing are disabled.
 */
export function MoveToMenu({ blockId, screenId }: MoveToMenuProps) {
  const t = useDictionary(layout);
  const id = useId();
  const actions = useLayoutActions();
  const store = useLayoutStoreApi();
  const announce = useDndAnnounce();
  const commitRect = useCommitRect();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const doc = useLayoutStore((state) => state.screens[screenId]?.layout ?? null);
  // Planning every option costs a few passes over the blocks: only while the menu is open.
  const options = useMemo(() => (open && doc ? moveOptions(doc, blockId) : null), [open, doc, blockId]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const fresh = () => store.getState().screens[screenId]?.layout ?? null;
  const nameOf = (target: BlockId) => fresh()?.blocks[target]?.label ?? target;

  const move = (target: MoveTarget) => {
    const before = fresh();
    if (!before) return close();
    const oldParent = parentOf(before, blockId);
    const fixes = planMoveTo(before, blockId, target);
    close();
    if (fixes.length === 0) return;
    actions.beginBatch();
    for (const fix of fixes) actions.applyFix(fix, screenId);
    actions.commitBatch();
    const after = fresh();
    const block = after?.blocks[blockId];
    if (!after || !block) return;
    if (target.kind === "into") announce(t.adjusted.nest(block.label, nameOf(target.parentId)));
    else if (target.kind === "out" && oldParent !== undefined) announce(t.adjusted.unnest(block.label, nameOf(oldParent)));
    else announce(t.canvas.moved(block.label, block.rect));
  };

  const align = (target: AlignTarget) => {
    const current = fresh();
    const rect = current ? alignRect(current, blockId, target) : null;
    close();
    if (rect) commitRect(blockId, rect, screenId, target === "full" ? "resized" : "moved");
  };

  const nested = options !== null && (options.into.length > 0 || options.out);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label={t.inspector.moveTo}
      align="end"
      className="w-64 p-1.5"
      trigger={(props) => (
        <Button ref={triggerRef} size="sm" leadingIcon={<MoveIcon />} trailingIcon={<ChevronDownIcon />} {...props}>
          {t.inspector.moveTo}
        </Button>
      )}
    >
      {options && (
        <div className="flex max-h-[min(26rem,70vh)] flex-col gap-1 overflow-y-auto overscroll-contain">
          <MenuGroup id={`${id}-order`} title={t.inspector.moveToGroups.order}>
            <MenuItem label={t.inspector.moveToOptions.top} enabled={options.top} onSelect={() => move({ kind: "top" })} />
            <MenuItem label={t.inspector.moveToOptions.bottom} enabled={options.bottom} onSelect={() => move({ kind: "bottom" })} />
          </MenuGroup>
          <MenuGroup id={`${id}-align`} title={t.inspector.moveToGroups.align}>
            {ALIGN_ORDER.map((target) => (
              <MenuItem
                key={target}
                label={t.inspector.moveToOptions[target === "full" ? "fullWidth" : target]}
                enabled={options.align[target]}
                onSelect={() => align(target)}
              />
            ))}
          </MenuGroup>
          {nested && (
            <MenuGroup id={`${id}-nest`} title={t.inspector.moveToGroups.nest}>
              {options.into.map((parentId) => (
                <MenuItem
                  key={parentId}
                  label={t.inspector.moveInto(doc?.blocks[parentId]?.label ?? parentId)}
                  icon={<NestIcon />}
                  enabled
                  onSelect={() => move({ kind: "into", parentId })}
                />
              ))}
              {options.out && <MenuItem label={t.inspector.moveOut} enabled onSelect={() => move({ kind: "out" })} />}
            </MenuGroup>
          )}
        </div>
      )}
    </Popover>
  );
}

/* Parts of the menu, only used together in this file. */

type MenuGroupProps = { id: string; title: string; children: ReactNode };

function MenuGroup({ id, title, children }: MenuGroupProps) {
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-0.5">
      <p id={id} className="px-2 pt-1 text-caption font-medium text-muted">
        {title}
      </p>
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}

type MenuItemProps = { label: string; enabled: boolean; onSelect: () => void; icon?: ReactNode };

function MenuItem({ label, enabled, onSelect, icon }: MenuItemProps) {
  return (
    <li>
      <button type="button" disabled={!enabled} onClick={onSelect} className={ITEM}>
        {icon}
        <span className="min-w-0 truncate">{label}</span>
      </button>
    </li>
  );
}
