import type { ReactNode } from "react";
import "./GalleryState.css";

export interface GalleryStateProps {
  label: string;
  stretch?: boolean;
  children: ReactNode;
}

/** Un ejemplo con el nombre del estado debajo («hover», «foco»…). */
export function GalleryState({ label, stretch, children }: GalleryStateProps) {
  return (
    <div className="dl-gallery-state" data-stretch={stretch ? "" : undefined}>
      {children}
      <span className="dl-gallery-state__label" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
