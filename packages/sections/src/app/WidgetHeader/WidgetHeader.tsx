import type { ReactNode } from "react";
import "./WidgetHeader.css";

export interface WidgetHeaderProps {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/** Title row shared by the dashboard widgets: h2, muted description and actions on the end. */
export function WidgetHeader({ id, title, description, actions }: WidgetHeaderProps) {
  return (
    <div className="dl-app-widget-header">
      <div className="dl-app-widget-header__text">
        <h2 id={id} className="dl-app-widget-header__title">
          {title}
        </h2>
        {description ? <p className="dl-app-widget-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="dl-app-widget-header__actions">{actions}</div> : null}
    </div>
  );
}
