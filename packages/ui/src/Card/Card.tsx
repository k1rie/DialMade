import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import type { PreviewState } from "../lib/types";
import "./Card.css";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "article" | "section" | "li" | "aside";
  variant?: "default" | "muted" | "outline";
  /** Eleva la card al pasar por encima; útil cuando contiene un enlace o botón principal. */
  interactive?: boolean;
  previewState?: PreviewState;
}

export function Card({
  as: Tag = "div",
  variant = "default",
  interactive,
  previewState,
  className,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cx("dl-card", className)}
      data-variant={variant}
      data-interactive={interactive ? "" : undefined}
      data-preview-state={previewState}
      {...props}
    />
  );
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  /** Acciones a la derecha del título (un botón, un menú…). */
  action?: ReactNode;
  titleAs?: "h2" | "h3" | "h4" | "p";
}

export function CardHeader({ title, description, action, titleAs: Title = "h3", className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cx("dl-card__header", className)} {...props}>
      <div className="dl-card__heading">
        {title != null && <Title className="dl-card__title">{title}</Title>}
        {description != null && <p className="dl-card__description">{description}</p>}
        {children}
      </div>
      {action != null && <div className="dl-card__action">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("dl-card__body", className)} {...props} />;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "between";
  divider?: boolean;
}

export function CardFooter({ align = "start", divider, className, ...props }: CardFooterProps) {
  return (
    <div
      className={cx("dl-card__footer", className)}
      data-align={align}
      data-divider={divider ? "" : undefined}
      {...props}
    />
  );
}
