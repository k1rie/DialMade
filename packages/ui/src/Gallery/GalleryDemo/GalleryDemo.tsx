import type { ReactNode } from "react";
import "./GalleryDemo.css";

export interface GalleryDemoProps {
  label: string;
  /** `full` ocupa todo el ancho de la sección. */
  span?: "auto" | "full";
  /** Sin marco punteado: para componentes que ya tienen superficie propia (cards, tablas). */
  bare?: boolean;
  children: ReactNode;
}

export function GalleryDemo({ label, span = "auto", bare, children }: GalleryDemoProps) {
  return (
    <div className="dl-gallery-demo" data-span={span} data-bare={bare ? "" : undefined}>
      <p className="dl-gallery-demo__label">{label}</p>
      <div className="dl-gallery-demo__surface">{children}</div>
    </div>
  );
}
