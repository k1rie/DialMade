"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import type { CSSProperties } from "react";
import type { Size } from "../geometry";

export type CropPreviewProps = {
  src: string;
  image: Size;
  rect: { x: MotionValue<number>; y: MotionValue<number>; w: MotionValue<number>; h: MotionValue<number> };
  backdrop: CSSProperties;
  /** Box side in px. */
  size?: number;
};

/** Live thumbnail of the cropped area, driven by the same motion values as the frame. */
export function CropPreview({ src, image, rect, backdrop, size = 104 }: CropPreviewProps) {
  const fit = useTransform(() => size / Math.max(rect.w.get(), rect.h.get(), 1e-6));
  const width = useTransform(() => rect.w.get() * fit.get());
  const height = useTransform(() => rect.h.get() * fit.get());
  const left = useTransform(() => -rect.x.get() * fit.get());
  const top = useTransform(() => -rect.y.get() * fit.get());
  const imageWidth = useTransform(() => image.w * fit.get());
  const imageHeight = useTransform(() => image.h * fit.get());

  return (
    <div aria-hidden className="grid shrink-0 place-items-center rounded-control border border-app" style={{ ...backdrop, width: size + 16, height: size + 16 }}>
      <motion.div className="relative overflow-hidden" style={{ width, height }}>
        <motion.img
          src={src}
          alt=""
          draggable={false}
          className="absolute max-w-none select-none"
          style={{ left, top, width: imageWidth, height: imageHeight }}
        />
      </motion.div>
    </div>
  );
}
