"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { sectionStrings } from "../../lib/strings";
import { typeClass } from "../../lib/typeClass";
import type { RenderContext } from "../../types";
import { EditInert } from "../EditInert";

export interface SectionFrameProps {
  id: string;
  type: string;
  label: string;
  ctx: RenderContext;
  /** Containers keep their children selectable and make their own chrome inert (see `EditInert`). */
  container?: boolean;
  /**
   * Structural elements (inferred regions, the layout scope) are a plain box in every mode: no tab stop,
   * role or click selection, and their children stay selectable. Clicks fall through to the page.
   */
  structural?: boolean;
  /** Extra `data-*` attributes of the wrapper (a region's layout kind…). */
  attributes?: Readonly<Record<`data-${string}`, string>>;
  children: ReactNode;
}

/**
 * The wrapper of every element: `data-dl-id` / `data-dl-type` always; in edit mode it is focusable and
 * selectable by click, Enter or Space. The app paints the selection from `data-dl-selected`.
 * In edit mode the content of a leaf section is `inert`: its buttons, links and fields are neither
 * clickable nor tabbable (one tab stop per section; a demo dialog cannot open over the app).
 */
export function SectionFrame({ id, type, label, ctx, container = false, structural = false, attributes, children }: SectionFrameProps) {
  const className = cx("dl-el", `dl-el--${typeClass(type)}`);
  if (!ctx.interactive || structural) {
    return (
      <div className={className} data-dl-id={id} data-dl-type={type} {...attributes}>
        {children}
      </div>
    );
  }

  const selected = ctx.selectedId === id;
  const select = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    ctx.onSelect?.(id);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    event.stopPropagation();
    ctx.onSelect?.(id);
  };

  return (
    <div
      className={className}
      data-dl-id={id}
      data-dl-type={type}
      {...attributes}
      data-dl-selected={selected ? "" : undefined}
      tabIndex={0}
      role="group"
      aria-roledescription={sectionStrings(ctx.locale).editableSection}
      aria-label={label}
      aria-current={selected ? "true" : undefined}
      onClick={select}
      onKeyDown={onKeyDown}
    >
      {container ? children : <EditInert ctx={ctx}>{children}</EditInert>}
    </div>
  );
}
