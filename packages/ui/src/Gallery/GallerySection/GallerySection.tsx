"use client";

import type { ReactNode } from "react";
import type { GallerySectionId } from "../sections";
import { useGalleryCopy } from "../useGalleryCopy";
import "./GallerySection.css";

export interface GallerySectionProps {
  id: GallerySectionId;
  headingLevel: 2 | 3;
  children: ReactNode;
}

export function GallerySection({ id, headingLevel, children }: GallerySectionProps) {
  const copy = useGalleryCopy().sections[id];
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const headingId = `dl-gallery-${id}`;
  return (
    <section className="dl-gallery-section" aria-labelledby={headingId} data-section={id}>
      <header className="dl-gallery-section__header">
        <Heading id={headingId} className="dl-gallery-section__title">
          {copy.title}
        </Heading>
        <p className="dl-gallery-section__description">{copy.description}</p>
      </header>
      <div className="dl-gallery-section__grid">{children}</div>
    </section>
  );
}
