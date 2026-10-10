"use client";

import { Button } from "@dialmade/ui";
import { EditInert } from "../../PageRenderer/EditInert";
import type { SectionComponentProps } from "../../types";
import { appStrings } from "../content";
import type { ShellProps, ShellVariant } from "./schema";
import { ShellSidebar } from "./ShellSidebar";
import { ShellTopbar } from "./ShellTopbar";
import "./Shell.css";

/**
 * Dashboard frame: navigation (sidebar, inset, rail or top bar), top bar and page header around the
 * widgets, which arrive already rendered as `children` and sit on a 12-column grid. In edit mode its
 * own chrome is inert so only the widgets stay selectable.
 */
export function Shell({ variant, ctx, elementId, children, ...props }: SectionComponentProps<ShellProps>) {
  const strings = appStrings(ctx.locale);
  const layout = variant as ShellVariant;
  const titleId = `${elementId}-title`;
  const logo = ctx.brand.logoUrl ? { logoUrl: ctx.brand.logoUrl } : {};
  const buttonSize = props.density === "compact" ? "sm" : "md";

  return (
    <div className="dl-app-shell" data-mode={ctx.mode}>
      <div className="dl-app-shell__frame" data-variant={layout} data-tone={props.tone} data-density={props.density}>
        {layout === "topnav" ? null : (
          <EditInert ctx={ctx}>
            <ShellSidebar
              brandName={props.brandName}
              workspace={props.workspace}
              nav={props.nav}
              activeId={props.activeId}
              user={props.user}
              strings={strings}
              {...logo}
            />
          </EditInert>
        )}
        <div className="dl-app-shell__main">
          <EditInert ctx={ctx}>
            <ShellTopbar
              variant={layout}
              brandName={props.brandName}
              nav={props.nav}
              activeId={props.activeId}
              user={props.user}
              searchPlaceholder={props.searchPlaceholder}
              showSearch={props.showSearch}
              strings={strings}
              {...logo}
            />
          </EditInert>
          <section className="dl-app-shell__page" aria-labelledby={titleId}>
            <EditInert ctx={ctx}>
              <div className="dl-app-shell__page-header">
                <div className="dl-app-shell__heading">
                  <h1 id={titleId} className="dl-app-shell__title">
                    {props.title}
                  </h1>
                  {props.subtitle ? <p className="dl-app-shell__subtitle">{props.subtitle}</p> : null}
                </div>
                <div className="dl-app-shell__actions">
                  <Button variant="outline" size={buttonSize} iconStart="download">
                    {strings.export}
                  </Button>
                  {props.primaryAction ? (
                    <Button variant="primary" size={buttonSize} iconStart="plus">
                      {props.primaryAction}
                    </Button>
                  ) : null}
                </div>
              </div>
            </EditInert>
            <div className="dl-app-shell__content">{children}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
