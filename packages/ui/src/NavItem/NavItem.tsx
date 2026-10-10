import type { MouseEventHandler, ReactNode } from "react";
import { renderIcon, type IconSlot } from "../Icon/renderIcon";
import { cx } from "../lib/cx";
import type { PreviewState } from "../lib/types";
import "./NavItem.css";

export interface NavItemProps {
  label: ReactNode;
  icon?: IconSlot;
  /** Con `href` es un enlace; sin él, un botón. */
  href?: string;
  /** Página actual: `aria-current="page"`. */
  active?: boolean;
  disabled?: boolean;
  /** Contador a la derecha (no leídos, pendientes…). */
  count?: number;
  /** Contenido libre a la derecha, por ejemplo un `<Badge>`. */
  end?: ReactNode;
  orientation?: "vertical" | "horizontal";
  previewState?: PreviewState;
  onClick?: MouseEventHandler<HTMLElement>;
  className?: string;
}

export function NavItem({
  label,
  icon,
  href,
  active,
  disabled,
  count,
  end,
  orientation = "vertical",
  previewState,
  onClick,
  className,
}: NavItemProps) {
  const common = {
    className: cx("dl-nav-item", className),
    "aria-current": active ? ("page" as const) : undefined,
    "aria-disabled": disabled || undefined,
    "data-orientation": orientation,
    "data-preview-state": previewState,
  };
  const content = (
    <>
      {renderIcon(icon, "dl-nav-item__icon")}
      <span className="dl-nav-item__label">{label}</span>
      {(count != null || end != null) && (
        <span className="dl-nav-item__end">
          {count != null && <span className="dl-nav-item__count">{count}</span>}
          {end}
        </span>
      )}
    </>
  );
  if (href != null && !disabled) {
    return (
      <a href={href} onClick={onClick} {...common}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={disabled ? undefined : onClick} {...common}>
      {content}
    </button>
  );
}
