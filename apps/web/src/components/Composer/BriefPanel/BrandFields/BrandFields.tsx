"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { useDesignDocActions } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";

export type BrandFieldsProps = {
  name: string;
  tagline: string | undefined;
};

type Field = "name" | "tagline";

const inline =
  "w-full rounded-[8px] border border-transparent bg-transparent px-2 py-1 -mx-2 text-fg transition-[border-color,background-color] duration-150 " +
  "placeholder:text-subtle hover:border-app focus:border-app-strong focus:bg-white/[0.03]";

/**
 * Brand name and tagline edited inline. Every keystroke updates the page live (bindings follow) and
 * one edit session is one undo step; Esc restores the value it had on focus.
 */
export function BrandFields({ name, tagline }: BrandFieldsProps) {
  const t = useDictionary(composer);
  const actions = useDesignDocActions();
  const nameId = useId();
  const taglineId = useId();
  const [editing, setEditing] = useState<{ field: Field; value: string } | null>(null);

  const valueOf = (field: Field) => (editing?.field === field ? editing.value : field === "name" ? name : (tagline ?? ""));

  const begin = (field: Field) => {
    actions.beginBatch();
    setEditing({ field, value: field === "name" ? name : (tagline ?? "") });
  };
  const change = (field: Field, value: string) => {
    setEditing({ field, value });
    if (field === "name") {
      if (value.trim()) actions.setBrandText({ name: value });
    } else actions.setBrandText({ tagline: value });
  };
  const end = () => {
    actions.commitBatch();
    setEditing(null);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      event.stopPropagation();
      actions.cancelBatch();
      setEditing(null);
      event.currentTarget.blur();
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={nameId} className="sr-only">
        {t.brief.name}
      </label>
      <input
        id={nameId}
        value={valueOf("name")}
        maxLength={80}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => begin("name")}
        onChange={(event) => change("name", event.target.value)}
        onBlur={end}
        onKeyDown={onKeyDown}
        className={cn(inline, "text-h3")}
      />
      <label htmlFor={taglineId} className="sr-only">
        {t.brief.tagline}
      </label>
      <input
        id={taglineId}
        value={valueOf("tagline")}
        maxLength={200}
        autoComplete="off"
        placeholder={t.brief.taglinePlaceholder}
        onFocus={() => begin("tagline")}
        onChange={(event) => change("tagline", event.target.value)}
        onBlur={end}
        onKeyDown={onKeyDown}
        className={cn(inline, "text-small text-muted focus:text-fg")}
      />
    </div>
  );
}
