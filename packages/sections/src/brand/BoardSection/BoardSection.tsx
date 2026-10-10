import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import type { RenderContext } from "../../types";
import { BOARD_SECTION_NAMES, boardNumberOf } from "../lib/board";
import "./BoardSection.css";

export interface BoardSectionProps {
  ctx: Pick<RenderContext, "doc" | "locale">;
  /** Element type (`brand.palette`): names the kicker and finds the section's number on the board. */
  type: string;
  elementId: string;
  title: string;
  intro?: string;
  variant?: string;
  /** Extra content on the head's end (summaries, legends). */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Shell of a numbered section of the brand board: kicker with its number, title, intro and body. */
export function BoardSection({ ctx, type, elementId, title, intro, variant, aside, className, children }: BoardSectionProps) {
  const titleId = `${elementId}-title`;
  const number = boardNumberOf(ctx, elementId, type);
  const kicker = BOARD_SECTION_NAMES[type]?.[ctx.locale];
  return (
    <section className={cx("dl-board-section", className)} data-variant={variant} aria-labelledby={titleId}>
      <div className="dl-board-section__inner">
        <header className="dl-board-section__head">
          <div className="dl-board-section__heading">
            <p className="dl-board-section__kicker">
              {number && <span className="dl-board-section__number">{number}</span>} {kicker && <span>{kicker}</span>}
            </p>
            <h2 id={titleId} className="dl-board-section__title">
              {title}
            </h2>
          </div>
          {(intro || aside) && (
            <div className="dl-board-section__aside">
              {intro && <p className="dl-board-section__intro">{intro}</p>}
              {aside}
            </div>
          )}
        </header>
        <div className="dl-board-section__body">{children}</div>
      </div>
    </section>
  );
}
