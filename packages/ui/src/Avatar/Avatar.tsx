"use client";

import { useState, type HTMLAttributes } from "react";
import { cx } from "../lib/cx";
import { useUiStrings } from "../UiProvider";
import { VisuallyHidden } from "../VisuallyHidden";
import { colorIndexOf, initialsOf } from "./initials";
import "./Avatar.css";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "online" | "away" | "busy" | "offline";

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  src?: string;
  size?: AvatarSize;
  shape?: "circle" | "square";
  status?: AvatarStatus;
}

/** Foto con las iniciales como respaldo (también si la imagen falla). */
export function Avatar({ name, src, size = "md", shape = "circle", status, className, ...props }: AvatarProps) {
  const strings = useUiStrings();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src != null && src !== failedSrc;
  return (
    <span
      className={cx("dl-avatar", className)}
      data-size={size}
      data-shape={shape}
      data-color={colorIndexOf(name)}
      {...props}
    >
      {showImage ? (
        <img className="dl-avatar__image" src={src} alt={name} onError={() => setFailedSrc(src)} />
      ) : (
        <span className="dl-avatar__fallback" role="img" aria-label={name}>
          <span aria-hidden="true">{initialsOf(name)}</span>
        </span>
      )}
      {status && (
        <span className="dl-avatar__status" data-status={status}>
          <VisuallyHidden>{strings.avatarStatus[status]}</VisuallyHidden>
        </span>
      )}
    </span>
  );
}
