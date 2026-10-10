"use client";

import { useEffect, useState } from "react";
import { cropToBlob, isFullCrop, type CropRect, type FlowLogo } from "@/lib/image";

const LOGO_MAX_SIZE = 1024;

/**
 * The logo as the user's pages show it: the flow's blob URL when uncropped, otherwise a PNG of the
 * crop (≤1024 px) whose blob URL this hook owns and revokes.
 */
export function useCroppedLogoUrl(logo: FlowLogo | undefined, crop: CropRect | undefined, enabled: boolean): string | undefined {
  const needsCrop = !!logo && enabled && !isFullCrop(crop);
  const [cropped, setCropped] = useState<{ source: string; crop: CropRect; url: string } | undefined>(undefined);

  useEffect(() => {
    if (!needsCrop || !logo || !crop) return;
    let active = true;
    let url: string | undefined;
    cropToBlob(logo.objectUrl, { crop, maxSize: LOGO_MAX_SIZE, ...(logo.svgText && { svgText: logo.svgText }) })
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setCropped({ source: logo.objectUrl, crop, url });
      })
      .catch(() => {});
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [needsCrop, logo, crop]);

  if (!logo || !enabled) return undefined;
  if (!needsCrop) return logo.objectUrl;
  return cropped && cropped.source === logo.objectUrl && cropped.crop === crop ? cropped.url : undefined;
}
