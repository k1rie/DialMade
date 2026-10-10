"use client";

import { Gallery } from "@dialmade/ui";
import type { SectionComponentProps } from "../../types";
import { appStrings } from "../content";
import type { ComponentGalleryProps } from "./schema";
import { GALLERY_INDEX_LABELS, gallerySectionAnchor, gallerySectionsFor } from "./sections";
import "./ComponentGallery.css";

/** The @dialmade/ui kit with the user's theme: every component with its variants and states. */
export function ComponentGallery({ brandName, title, subtitle, scope, variant, ctx, elementId }: SectionComponentProps<ComponentGalleryProps>) {
  const strings = appStrings(ctx.locale);
  const titleId = `${elementId}-title`;
  const sections = gallerySectionsFor(scope);
  const indexed = variant === "index";
  return (
    <section className="dl-app-gallery" data-layout={indexed ? "index" : "stacked"} aria-labelledby={titleId}>
      <div className="dl-app-gallery__inner">
        <header className="dl-app-gallery__header">
          <p className="dl-app-gallery__eyebrow">{strings.galleryEyebrow(brandName)}</p>
          <h2 id={titleId} className="dl-app-gallery__title">
            {title}
          </h2>
          {subtitle ? <p className="dl-app-gallery__subtitle">{subtitle}</p> : null}
        </header>
        <div className="dl-app-gallery__body">
          {indexed ? (
            <nav className="dl-app-gallery__index" aria-label={strings.galleryIndex}>
              <ol className="dl-app-gallery__index-list" role="list">
                {sections.map((id) => (
                  <li key={id}>
                    <a className="dl-app-gallery__index-link" href={`#${gallerySectionAnchor(id)}`}>
                      {GALLERY_INDEX_LABELS[ctx.locale][id]}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <Gallery className="dl-app-gallery__kit" locale={ctx.locale} sections={sections} headingLevel={3} />
        </div>
      </div>
    </section>
  );
}
