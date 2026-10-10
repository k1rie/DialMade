import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { ICONS, type IconName } from "./icons";

export type IconSlot = IconName | ReactNode;

export function isIconName(value: unknown): value is IconName {
  return typeof value === "string" && Object.hasOwn(ICONS, value);
}

/** Acepta el nombre de un icono del kit o cualquier nodo (un SVG propio, por ejemplo). */
export function renderIcon(icon: IconSlot, className?: string): ReactNode {
  if (icon == null || icon === false) return null;
  if (isIconName(icon)) return <Icon name={icon} className={className} />;
  return <span className={className} aria-hidden="true">{icon}</span>;
}
