"use client";

import type { ComponentType } from "react";
import type { Locale } from "@dialmade/catalog";
import { cx } from "../lib/cx";
import { UiProvider } from "../UiProvider";
import { AvatarsDemo } from "./AvatarsDemo";
import { BadgesDemo } from "./BadgesDemo";
import { ButtonsDemo } from "./ButtonsDemo";
import { CardsDemo } from "./CardsDemo";
import { ChartsDemo } from "./ChartsDemo";
import { FeedbackDemo } from "./FeedbackDemo";
import { FormsDemo } from "./FormsDemo";
import { GallerySection } from "./GallerySection";
import { NavigationDemo } from "./NavigationDemo";
import { OverlaysDemo } from "./OverlaysDemo";
import { GALLERY_SECTIONS, type GallerySectionId } from "./sections";
import { SelectionDemo } from "./SelectionDemo";
import { StatsDemo } from "./StatsDemo";
import { TableDemo } from "./TableDemo";
import "./Gallery.css";

const DEMOS: Record<GallerySectionId, ComponentType> = {
  buttons: ButtonsDemo,
  forms: FormsDemo,
  selection: SelectionDemo,
  badges: BadgesDemo,
  avatars: AvatarsDemo,
  navigation: NavigationDemo,
  cards: CardsDemo,
  stats: StatsDemo,
  table: TableDemo,
  charts: ChartsDemo,
  overlays: OverlaysDemo,
  feedback: FeedbackDemo,
};

export interface GalleryProps {
  /** Idioma de los textos de ejemplo y de los textos internos. Sin él, el del `UiProvider` que lo envuelva. */
  locale?: Locale;
  /** Secciones a mostrar y en qué orden. Por defecto, todas. */
  sections?: readonly GallerySectionId[];
  headingLevel?: 2 | 3;
  className?: string;
}

/** Todos los componentes con sus variantes y estados, pintados con el tema activo. */
export function Gallery({ locale, sections = GALLERY_SECTIONS, headingLevel = 2, className }: GalleryProps) {
  const content = (
    <div className={cx("dl-gallery", className)}>
      {sections.map((id) => {
        const Demo = DEMOS[id];
        return (
          <GallerySection key={id} id={id} headingLevel={headingLevel}>
            <Demo />
          </GallerySection>
        );
      })}
    </div>
  );
  return locale ? <UiProvider locale={locale}>{content}</UiProvider> : content;
}
