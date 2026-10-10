"use client";

import type { HTMLAttributes } from "react";
import { cx } from "../../lib/cx";
import { useUiStrings } from "../../UiProvider";
import { Avatar, type AvatarSize } from "../Avatar";
import "./AvatarGroup.css";

export interface AvatarGroupItem {
  name: string;
  src?: string;
}

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  items: readonly AvatarGroupItem[];
  /** Cuántos se muestran antes del contador «+N». */
  max?: number;
  size?: AvatarSize;
  /** Nombre del grupo para lectores de pantalla («Equipo»). */
  label: string;
}

export function AvatarGroup({ items, max = 4, size = "md", label, className, ...props }: AvatarGroupProps) {
  const strings = useUiStrings();
  const visible = items.slice(0, max);
  const hidden = items.length - visible.length;
  return (
    <div role="group" aria-label={label} className={cx("dl-avatar-group", className)} data-size={size} {...props}>
      {visible.map((item) => (
        <Avatar key={item.name} name={item.name} src={item.src} size={size} />
      ))}
      {hidden > 0 && (
        <span className="dl-avatar dl-avatar-group__more" data-size={size}>
          <span className="dl-avatar__fallback" role="img" aria-label={strings.moreAvatars(hidden)}>
            <span aria-hidden="true">+{hidden}</span>
          </span>
        </span>
      )}
    </div>
  );
}
