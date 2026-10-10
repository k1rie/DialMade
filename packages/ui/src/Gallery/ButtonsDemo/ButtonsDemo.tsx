"use client";

import { BUTTON_SIZES, BUTTON_VARIANTS, Button } from "../../Button";
import { IconButton } from "../../IconButton";
import { GalleryDemo } from "../GalleryDemo";
import { GalleryState } from "../GalleryState";
import { useGalleryCopy } from "../useGalleryCopy";

export function ButtonsDemo() {
  const copy = useGalleryCopy();
  const t = copy.buttons;
  const s = copy.states;
  return (
    <>
      <GalleryDemo label={t.variants} span="full">
        <div className="dl-gallery-row">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {t.variantLabels[variant]}
            </Button>
          ))}
        </div>
      </GalleryDemo>
      <GalleryDemo label={t.sizes}>
        <div className="dl-gallery-row">
          {BUTTON_SIZES.map((size) => (
            <Button key={size} size={size}>
              {t.sizeLabels[size]}
            </Button>
          ))}
        </div>
      </GalleryDemo>
      <GalleryDemo label={t.withIcon}>
        <div className="dl-gallery-row">
          <Button iconStart="plus">{t.newProject}</Button>
          <Button variant="outline" iconEnd="arrow-right">
            {t.continue}
          </Button>
          <Button variant="secondary" iconStart="download" size="sm">
            {t.download}
          </Button>
        </div>
      </GalleryDemo>
      <GalleryDemo label={t.iconOnly}>
        <div className="dl-gallery-row">
          <IconButton icon="search" label={t.search} variant="outline" />
          <IconButton icon="bell" label={t.notifications} />
          <IconButton icon="sliders" label={t.settings} variant="secondary" />
          <IconButton icon="plus" label={t.newProject} variant="primary" round />
          <IconButton icon="more" label={t.more} size="sm" />
        </div>
      </GalleryDemo>
      {(["primary", "outline"] as const).map((variant) => (
        <GalleryDemo key={variant} label={`${t.states} · ${t.variantLabels[variant]}`} span="full">
          <div className="dl-gallery-row" data-align="start">
            <GalleryState label={s.default}>
              <Button variant={variant}>{t.save}</Button>
            </GalleryState>
            <GalleryState label={s.hover}>
              <Button variant={variant} previewState="hover">
                {t.save}
              </Button>
            </GalleryState>
            <GalleryState label={s.focus}>
              <Button variant={variant} previewState="focus">
                {t.save}
              </Button>
            </GalleryState>
            <GalleryState label={s.active}>
              <Button variant={variant} previewState="active">
                {t.save}
              </Button>
            </GalleryState>
            <GalleryState label={s.disabled}>
              <Button variant={variant} disabled>
                {t.save}
              </Button>
            </GalleryState>
            <GalleryState label={s.loading}>
              <Button variant={variant} loading>
                {t.save}
              </Button>
            </GalleryState>
          </div>
        </GalleryDemo>
      ))}
    </>
  );
}
