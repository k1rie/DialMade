import type { SVGAttributes } from "react";
import { cx } from "../lib/cx";
import { ICONS, type IconName } from "./icons";
import "./Icon.css";

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, "children"> {
  name: IconName;
  size?: number | string;
  /** Con `label` el icono se anuncia (`role="img"`); sin él es decorativo. */
  label?: string;
}

export function Icon({ name, size = "1em", label, className, ...props }: IconProps) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const, focusable: "false" as const };
  return (
    <svg
      className={cx("dl-icon", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      data-icon={name}
      {...a11y}
      {...props}
    >
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
