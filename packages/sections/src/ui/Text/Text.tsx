"use client";

import { Icon, buttonStyleProps } from "@dialmade/ui";
import { linkProps } from "../../context";
import type { SectionComponentProps } from "../../types";
import { UiBlock } from "../UiBlock";
import type { TextProps } from "./schema";
import "./Text.css";

/** Paragraphs of the body: a blank line starts a new one. */
const paragraphsOf = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

/** Free text: eyebrow, heading, body and an action link, as a heading, prose or a tinted callout. */
export function Text({
  eyebrow,
  title,
  body,
  action,
  level: Title,
  align,
  showBody,
  showAction,
  frame,
  variant,
  ctx,
  elementId,
}: SectionComponentProps<TextProps>) {
  const titleId = `${elementId}-title`;
  const callout = variant === "callout";
  const paragraphs = showBody ? paragraphsOf(body) : [];
  return (
    <UiBlock
      className="dl-ui-text"
      variant={variant}
      frame={frame}
      labelledBy={title ? titleId : undefined}
      data={{ "data-align": align, "data-level": Title }}
    >
      <div className="dl-ui-text__box">
        {callout ? (
          <span className="dl-ui-text__icon" aria-hidden="true">
            <Icon name="info" />
          </span>
        ) : null}
        <div className="dl-ui-text__copy">
          {eyebrow && !callout ? (
            <p className="dl-ui-text__eyebrow" data-dl-prop="eyebrow">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <Title id={titleId} className="dl-ui-text__title" data-dl-prop="title">
              {title}
            </Title>
          ) : null}
          {paragraphs.map((paragraph, i) => (
            <p key={i} className="dl-ui-text__paragraph" data-dl-prop="body">
              {paragraph}
            </p>
          ))}
          {action && showAction ? (
            <a {...linkProps(ctx, elementId)} {...buttonStyleProps({ variant: callout ? "primary" : "outline", className: "dl-ui-text__action" })}>
              {action}
            </a>
          ) : null}
        </div>
      </div>
    </UiBlock>
  );
}
