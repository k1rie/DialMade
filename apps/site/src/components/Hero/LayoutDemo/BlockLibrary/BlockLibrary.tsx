import type { DemoStrings } from "@/i18n";
import { format } from "@/i18n/format";
import { blockIds, blocks, type BlockId } from "@/lib/blocks";
import { cn } from "@/lib/cn";
import { PlusIcon } from "../icons";

export type BlockLibraryProps = {
  t: DemoStrings;
  blockNames: Record<BlockId, string>;
  /** The canvas is full: the buttons stay focusable (aria-disabled) and `onAdd` explains why. */
  full: boolean;
  fullText: string;
  onAdd: (id: BlockId) => void;
  firstButtonRef?: React.Ref<HTMLButtonElement>;
};

/** Klaviyo-style grid of blocks. Click (or Enter on focus) adds the block at the end of the page. */
export function BlockLibrary({ t, blockNames, full, fullText, onAdd, firstButtonRef }: BlockLibraryProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 border-b border-app p-3 sm:w-48 sm:shrink-0 sm:border-r sm:border-b-0">
      <p id="demo-library" className="font-mono text-caption text-muted">
        {t.library}
      </p>
      {full ? (
        <p id="demo-library-full" className="text-caption text-muted">
          {fullText}
        </p>
      ) : null}
      <ul aria-labelledby="demo-library" className="flex gap-1.5 overflow-x-auto scrollbar-none sm:grid sm:grid-cols-1 sm:overflow-visible">
        {blockIds.map((id, i) => (
          <li key={id} className="shrink-0">
            <button
              ref={i === 0 ? firstButtonRef : undefined}
              type="button"
              aria-disabled={full || undefined}
              aria-describedby={full ? "demo-library-full" : undefined}
              aria-label={format(t.add, { block: blockNames[id] })}
              aria-keyshortcuts={blocks[id].key}
              onClick={() => onAdd(id)}
              className={cn(
                "group flex h-8 w-full items-center gap-2 rounded-chip border border-app bg-surface/60 pr-2 pl-2 text-left text-small text-muted",
                "transition-[background-color,color,border-color] duration-150 hover:border-app-strong hover:bg-surface-hover hover:text-fg",
                // Dim the content, not the focus ring: the focused button stays clearly outlined.
                "aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:focus-visible:opacity-100",
              )}
            >
              <PlusIcon className="size-3 text-subtle group-hover:text-accent" />
              <span className="flex-1 whitespace-nowrap">{blockNames[id]}</span>
              <kbd className="hidden rounded-[4px] border border-app px-1 font-mono text-[10px] leading-4 text-muted sm:inline">
                {blocks[id].key}
              </kbd>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
