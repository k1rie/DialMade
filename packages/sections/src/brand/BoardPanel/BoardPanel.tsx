import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/cx";
import "./BoardPanel.css";

export interface BoardPanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  label?: string;
  /** Small mono text on the label's end (a value, a count). */
  meta?: ReactNode;
  tone?: "card" | "muted" | "plain";
  as?: "div" | "article" | "li";
}

/** A tile of the board: card surface of the theme with an optional label row (h3). */
export function BoardPanel({ label, meta, tone = "card", as: Tag = "div", className, children, ...props }: BoardPanelProps) {
  return (
    <Tag className={cx("dl-board-panel", className)} data-tone={tone} {...props}>
      {(label || meta) && (
        <div className="dl-board-panel__head">
          {label && <h3 className="dl-board-panel__title">{label}</h3>}
          {meta != null && <span className="dl-board-panel__meta">{meta}</span>}
        </div>
      )}
      {children}
    </Tag>
  );
}
