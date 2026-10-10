"use client";

import type { FormEvent } from "react";
import { Button, Card, Input, Select, Switch, Textarea } from "@dialmade/ui";
import type { SectionComponentProps } from "../../types";
import { LANGUAGE_OPTIONS, appStrings } from "../content";
import { WidgetHeader } from "../WidgetHeader";
import type { SettingsFormProps } from "./schema";
import "./SettingsForm.css";

const preventSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

/**
 * Workspace settings: text fields, selects and switches with the theme applied. Fields are
 * uncontrolled and keyed by their value, so an edit in the inspector shows up at once.
 */
export function SettingsForm({
  title,
  description,
  workspaceName,
  email,
  about,
  language,
  timezone,
  notifications,
  variant,
  ctx,
  elementId,
}: SectionComponentProps<SettingsFormProps>) {
  const strings = appStrings(ctx.locale).settings;
  const titleId = `${elementId}-title`;
  const generalId = `${elementId}-general`;
  const notificationsId = `${elementId}-notifications`;
  const zones: readonly string[] = strings.timezones;
  const timezones = zones.includes(timezone) ? zones : [timezone, ...zones];

  return (
    <Card as="section" className="dl-app-settings" data-layout={variant === "split" ? "split" : "stacked"} aria-labelledby={titleId}>
      <WidgetHeader id={titleId} title={title} description={description} />
      <form className="dl-app-settings__form" onSubmit={preventSubmit} aria-labelledby={titleId}>
        <div className="dl-app-settings__group" role="group" aria-labelledby={generalId}>
          <div className="dl-app-settings__group-head">
            <h3 id={generalId} className="dl-app-settings__group-title">
              {strings.general}
            </h3>
            <p className="dl-app-settings__group-hint">{strings.generalHint}</p>
          </div>
          <div className="dl-app-settings__fields">
            <Input key={`name:${workspaceName}`} label={strings.name} defaultValue={workspaceName} autoComplete="organization" />
            <Input
              key={`email:${email}`}
              type="email"
              label={strings.email}
              hint={strings.emailHint}
              defaultValue={email}
              iconStart="mail"
              autoComplete="email"
            />
            <Select
              key={`language:${language}`}
              label={strings.language}
              options={LANGUAGE_OPTIONS}
              defaultValue={language}
            />
            <Select
              key={`timezone:${timezone}`}
              label={strings.timezone}
              options={timezones.map((zone) => ({ value: zone, label: zone }))}
              defaultValue={timezone}
            />
            <Textarea
              key={`about:${about}`}
              label={strings.about}
              defaultValue={about}
              rows={3}
              fieldClassName="dl-app-settings__wide"
            />
          </div>
        </div>
        {notifications.length > 0 ? (
          <div className="dl-app-settings__group" role="group" aria-labelledby={notificationsId}>
            <div className="dl-app-settings__group-head">
              <h3 id={notificationsId} className="dl-app-settings__group-title">
                {strings.notifications}
              </h3>
              <p className="dl-app-settings__group-hint">{strings.notificationsHint}</p>
            </div>
            <ul className="dl-app-settings__toggles" role="list">
              {notifications.map((item) => (
                <li key={`${item.id}:${item.enabled}`} className="dl-app-settings__toggle">
                  <Switch
                    className="dl-app-settings__switch"
                    label={item.label}
                    description={item.description}
                    defaultChecked={item.enabled}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="dl-app-settings__footer">
          <Button variant="ghost">{strings.cancel}</Button>
          <Button type="submit">{strings.save}</Button>
        </div>
      </form>
    </Card>
  );
}
