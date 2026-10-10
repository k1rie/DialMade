"use client";

import { Badge, Icon, Skeleton, VisuallyHidden } from "@dialmade/ui";
import type { SectionComponentProps } from "../../types";
import { VOTE_URL, uiStrings } from "../content";
import { UiBlock } from "../UiBlock";
import type { PlaceholderProps } from "./schema";
import "./Placeholder.css";

/**
 * Stand-in for a free block or a «Pronto» one: its name, its note (user data, shown as plain text) and,
 * in the editor only, a link to vote for the block on GitHub.
 */
export function Placeholder({ blockLabel, blockNote, soon, count, frame, variant, ctx, elementId }: SectionComponentProps<PlaceholderProps>) {
  const strings = uiStrings(ctx.locale);
  const labelId = `${elementId}-label`;
  const label = blockLabel.trim() || (soon ? strings.soonBlock : strings.freeBlock);
  const lines = Math.min(6, Math.max(3, count));
  return (
    <UiBlock className="dl-ui-placeholder" variant={variant} frame={frame} labelledBy={labelId} data={{ "data-soon": soon ? "" : undefined }}>
      <div className="dl-ui-placeholder__box">
        <div className="dl-ui-placeholder__head">
          <span className="dl-ui-placeholder__icon" aria-hidden="true">
            <Icon name={soon ? "sparkle" : "edit"} />
          </span>
          <p id={labelId} className="dl-ui-placeholder__label">
            {label}
            {count > 1 ? <span className="dl-ui-placeholder__count"> ×{count}</span> : null}
          </p>
          {soon ? (
            <Badge variant="neutral" size="sm">
              {strings.soon}
            </Badge>
          ) : null}
        </div>
        {blockNote ? (
          <p className="dl-ui-placeholder__note">
            <VisuallyHidden>{`${strings.noteLabel}: `}</VisuallyHidden>
            {blockNote}
          </p>
        ) : (
          <p className="dl-ui-placeholder__note">{strings.placeholderHint}</p>
        )}
        {variant === "skeleton" ? (
          <div className="dl-ui-placeholder__skeleton">
            <Skeleton shape="text" lines={lines} />
          </div>
        ) : null}
        {soon && ctx.interactive ? (
          <a className="dl-ui__link dl-ui-placeholder__vote" href={VOTE_URL} target="_blank" rel="noopener noreferrer">
            {strings.vote}
            <VisuallyHidden>{` ${strings.opensInNewTab}`}</VisuallyHidden>
            <Icon name="external-link" />
          </a>
        ) : null}
      </div>
    </UiBlock>
  );
}
