"use client";

import { Feedback } from "@dnd-kit/dom";
import { useSortable } from "@dnd-kit/react/sortable";
import { memo, type KeyboardEvent } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import { DND_INSTRUCTIONS_ID } from "@/lib/dnd";
import { easeCss } from "@/lib/motion";
import { DND } from "../../../constants";
import { EyeIcon, EyeOffIcon, GripIcon } from "../../../icons";

const SECTIONS_GROUP = "composer-sections";

// Sortables settle into their new slot (dnd-kit's own drop), not the app's fly-into-a-slot animation.
type PluginsInput = NonNullable<Parameters<typeof useSortable>[0]["plugins"]>;
type SortablePlugins = Extract<PluginsInput, (...args: never[]) => unknown>;
const SORTABLE_PLUGINS: SortablePlugins = (defaults) => [
  ...defaults,
  Feedback.configure({ feedback: "default", dropAnimation: { duration: 220, easing: easeCss } }),
];
const SORTABLE_TRANSITION = { duration: 240, easing: easeCss, idle: true };

export type SectionRowProps = {
  id: string;
  index: number;
  label: string;
  detail: string | undefined;
  hidden: boolean;
  selected: boolean;
  /** False on a screen (its layout decides the order): no grip and no ⌥↑/⌥↓. Default true. */
  reorderable?: boolean;
  onSelect: (id: string) => void;
  onToggleHidden: (id: string, hide: boolean) => void;
  onMove: (id: string, delta: -1 | 1) => void;
};

/** One section in the list: grip (sortable handle), select button and show/hide. ⌥↑/⌥↓ move it. */
export const SectionRow = memo(function SectionRow({
  id,
  index,
  label,
  detail,
  hidden,
  selected,
  reorderable = true,
  onSelect,
  onToggleHidden,
  onMove,
}: SectionRowProps) {
  const { t } = useI18n();
  const c = useDictionary(composer);
  const { ref, handleRef, isDragging } = useSortable({
    id,
    index,
    type: DND.section,
    accept: DND.section,
    group: SECTIONS_GROUP,
    data: { label },
    plugins: SORTABLE_PLUGINS,
    transition: SORTABLE_TRANSITION,
    disabled: !reorderable,
  });

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!reorderable || !event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    onMove(id, event.key === "ArrowUp" ? -1 : 1);
  };

  return (
    <li
      ref={ref}
      data-dragging={isDragging || undefined}
      className={cn(
        "group relative flex items-center gap-0.5 rounded-control border p-0.5 transition-[background-color,border-color,opacity] duration-150",
        selected ? "glow-purple border-transparent bg-accent-soft/30" : "border-transparent hover:bg-white/[0.04]",
        isDragging && "z-10 border-app-strong bg-surface shadow-lift",
      )}
    >
      {reorderable && (
        <button
          ref={handleRef}
          type="button"
          aria-label={c.sections.handle(label)}
          aria-roledescription={t.dnd.roleDescription}
          aria-describedby={DND_INSTRUCTIONS_ID}
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-[8px] text-subtle transition-colors hover:text-fg [&_svg]:size-3.5",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
        >
          <GripIcon />
        </button>
      )}
      <button
        type="button"
        aria-current={selected || undefined}
        onClick={() => onSelect(id)}
        onKeyDown={onKeyDown}
        className={cn("flex min-w-0 flex-1 flex-col items-start rounded-[8px] px-1.5 py-1 text-start", !reorderable && "ps-2.5")}
      >
        {/* Hidden: muted, struck-through text and the eye-off icon; never opacity (it would drop below AA). */}
        <span className={cn("w-full truncate text-small", hidden ? "text-muted line-through decoration-white/30" : "text-fg")}>{label}</span>
        {(hidden || detail) && <span className="w-full truncate text-caption text-muted">{hidden ? c.sections.hidden : detail}</span>}
      </button>
      <IconButton
        size="sm"
        label={hidden ? c.sections.show(label) : c.sections.hide(label)}
        icon={hidden ? <EyeOffIcon /> : <EyeIcon />}
        tooltip={false}
        onClick={() => onToggleHidden(id, !hidden)}
        className={cn(
          !hidden && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
          hidden && "text-accent",
        )}
      />
    </li>
  );
});
