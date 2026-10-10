"use client";

import type { FormEvent } from "react";
import { Button } from "@dialmade/ui";
import type { SectionComponentProps } from "../../types";
import { purposeText, visibleFields, type PurposeText } from "../content";
import { UiBlock } from "../UiBlock";
import { FormField } from "./FormField";
import type { FormProps } from "./schema";
import "./Form.css";

const preventSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

/**
 * Sign in, sign up, contact, search or a generic form, with the kit's fields. A block linked to a screen
 * submits there in the static export (`action`, no JS); in React the submit is prevented and the button's
 * `data-dl-screen-link` lets the navigable preview switch screens.
 */
export function Form({
  title,
  description,
  submit,
  secondary,
  purpose,
  fields,
  count,
  frame,
  variant,
  ctx,
  elementId,
}: SectionComponentProps<FormProps>) {
  const titleId = `${elementId}-title`;
  const text = (key: PurposeText, own: string | undefined) => own ?? purposeText(purpose, key, ctx);
  const heading = text("title", title);
  const intro = text("description", description);
  const submitLabel = text("submit", submit) || purposeText(purpose, "submit", ctx);
  const secondaryLabel = text("secondary", secondary);
  const shown = visibleFields(fields, purpose, count);
  const href = ctx.blockLink?.(elementId) ?? null;
  const target = ctx.linkTarget?.(elementId) ?? null;
  const linkSecondary = purpose === "login" || purpose === "signup";

  return (
    <UiBlock
      className="dl-ui-form"
      variant={variant}
      frame={frame}
      labelledBy={heading ? titleId : undefined}
      data={{ "data-purpose": purpose }}
    >
      <div className="dl-ui-form__panel">
        {heading || intro ? (
          <div className="dl-ui-form__intro">
            {heading ? (
              <h2 id={titleId} className="dl-ui-form__title" data-dl-prop="title">
                {heading}
              </h2>
            ) : null}
            {intro ? (
              <p className="dl-ui-form__description" data-dl-prop="description">
                {intro}
              </p>
            ) : null}
          </div>
        ) : null}
        <form
          className="dl-ui-form__form"
          aria-labelledby={heading ? titleId : undefined}
          onSubmit={preventSubmit}
          {...(href ? { action: href, method: "get" } : {})}
        >
          <div className="dl-ui-form__fields">
            {shown.map((field) => (
              <FormField
                key={field.id}
                field={field}
                id={`${elementId}-${field.id}`}
                purpose={purpose}
                prop={`fields/${fields.indexOf(field)}`}
              />
            ))}
          </div>
          <div className="dl-ui-form__actions">
            <Button type="submit" variant="primary" data-dl-screen-link={target ?? undefined} data-dl-prop="submit">
              {submitLabel}
            </Button>
            {secondaryLabel ? (
              linkSecondary ? (
                <a href="#" className="dl-ui__link dl-ui-form__secondary" data-dl-prop="secondary">
                  {secondaryLabel}
                </a>
              ) : (
                <Button type="button" variant="ghost" data-dl-prop="secondary">
                  {secondaryLabel}
                </Button>
              )
            ) : null}
          </div>
        </form>
      </div>
    </UiBlock>
  );
}
