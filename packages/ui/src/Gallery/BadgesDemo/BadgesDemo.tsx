"use client";

import { BADGE_VARIANTS, Badge } from "../../Badge";
import { GalleryDemo } from "../GalleryDemo";
import { useGalleryCopy } from "../useGalleryCopy";

export function BadgesDemo() {
  const t = useGalleryCopy().badges;
  return (
    <>
      <GalleryDemo label={t.soft}>
        <div className="dl-gallery-row">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {t.labels[variant]}
            </Badge>
          ))}
        </div>
      </GalleryDemo>
      <GalleryDemo label={t.solid}>
        <div className="dl-gallery-row">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant} appearance="solid">
              {t.labels[variant]}
            </Badge>
          ))}
        </div>
      </GalleryDemo>
      <GalleryDemo label={t.withDot}>
        <div className="dl-gallery-row">
          <Badge variant="success" dot>
            {t.online}
          </Badge>
          <Badge variant="warning" dot>
            {t.labels.warning}
          </Badge>
          <Badge variant="info" icon="sparkle">
            {t.labels.default}
          </Badge>
          <Badge size="sm">{t.small}</Badge>
          <Badge size="lg" variant="outline">
            {t.large}
          </Badge>
        </div>
      </GalleryDemo>
    </>
  );
}
