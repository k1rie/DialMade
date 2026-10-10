"use client";

import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { renderIcon, type IconSlot } from "../Icon/renderIcon";
import { cx } from "../lib/cx";
import { useUiStrings } from "../UiProvider";
import "./Breadcrumb.css";

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  icon?: IconSlot;
}

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
  separator?: "chevron" | "slash";
  /** Nombre accesible del `<nav>`. Por defecto, «Ruta de navegación» del idioma activo. */
  label?: string;
  className?: string;
}

/** El último elemento es la página actual (`aria-current="page"`). */
export function Breadcrumb({ items, separator = "chevron", label, className }: BreadcrumbProps) {
  const strings = useUiStrings();
  return (
    <nav aria-label={label ?? strings.breadcrumb} className={cx("dl-breadcrumb", className)}>
      <ol className="dl-breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const content = (
            <>
              {renderIcon(item.icon)}
              {item.label}
            </>
          );
          return (
            <li key={index} className="dl-breadcrumb__item">
              {isLast ? (
                <span className="dl-breadcrumb__current" aria-current="page">
                  {content}
                </span>
              ) : item.href != null ? (
                <a className="dl-breadcrumb__link" href={item.href}>
                  {content}
                </a>
              ) : (
                <span className="dl-breadcrumb__link">{content}</span>
              )}
              {!isLast && (
                <span className="dl-breadcrumb__separator" aria-hidden="true">
                  {separator === "slash" ? "/" : <Icon name="chevron-right" />}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
