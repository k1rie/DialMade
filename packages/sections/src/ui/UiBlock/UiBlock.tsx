import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import type { UiFrame } from "../lib/fit";
import "./UiBlock.css";

export interface UiBlockProps {
  /** Block class of the section (`dl-ui-cards`). Its stylesheet adds its own container name. */
  className: string;
  variant: string;
  frame: UiFrame;
  as?: "section" | "div" | "article" | "aside" | "figure";
  labelledBy?: string;
  label?: string;
  /** Extra `data-*` attributes for the block's own styles. */
  data?: Record<`data-${string}`, string | undefined>;
  children: ReactNode;
}

/**
 * Outer box of every ui.* block: the query container (`dl-ui` plus the block's own name), the surface
 * (`plain`, `card`) or the landing frame (`section`: vertical rhythm, gutters and the centered
 * `--dl-container`, like the landing sections). The inner box fills the block's height, so a block
 * stretched by its grid cell lays its content out in all of it.
 */
export function UiBlock({ className, variant, frame, as: Tag = "section", labelledBy, label, data, children }: UiBlockProps) {
  return (
    <Tag
      className={cx("dl-ui", className)}
      data-variant={variant}
      data-frame={frame}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      {...data}
    >
      <div className="dl-ui__inner">{children}</div>
    </Tag>
  );
}
