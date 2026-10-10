"use client";

import { useUiLocale } from "../UiProvider";
import { GALLERY_COPY, type GalleryCopy } from "./copy";

export function useGalleryCopy(): GalleryCopy {
  return GALLERY_COPY[useUiLocale()];
}
