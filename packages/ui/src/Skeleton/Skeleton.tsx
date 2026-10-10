import type { CSSProperties, HTMLAttributes } from "react";
import { cx } from "../lib/cx";
import "./Skeleton.css";

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  shape?: "text" | "rect" | "circle";
  width?: number | string;
  height?: number | string;
  /** Solo con `shape="text"`: número de líneas (la última, más corta). */
  lines?: number;
}

/**
 * Bloque de carga decorativo (`aria-hidden`). El contenedor que espera datos debe anunciarlo,
 * por ejemplo con `aria-busy="true"` y un texto «Cargando…» oculto.
 */
export function Skeleton({ shape = "text", width, height, lines = 1, className, style, ...props }: SkeletonProps) {
  const sizeStyle: CSSProperties = { width, height, ...style };
  if (shape === "text" && lines > 1) {
    return (
      <span className={cx("dl-skeleton-lines", className)} aria-hidden="true" style={{ width }} {...props}>
        {Array.from({ length: lines }, (_, index) => (
          <span key={index} className="dl-skeleton" data-shape="text" style={{ height }} />
        ))}
      </span>
    );
  }
  return <span className={cx("dl-skeleton", className)} data-shape={shape} aria-hidden="true" style={sizeStyle} {...props} />;
}
