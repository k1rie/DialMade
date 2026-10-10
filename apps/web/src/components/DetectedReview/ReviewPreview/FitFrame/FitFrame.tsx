"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type FitFrameProps = {
  /** Size the content is laid out at (CSS px); the parent box has the same aspect ratio. */
  width: number;
  height: number;
  children: ReactNode;
};

/** Lays the mini out at its native size and scales it uniformly to the parent box (absolute, inset 0). */
export function FitFrame({ width, height, children }: FitFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, x: 0, y: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (!box || box.width === 0) return;
      const scale = Math.min(box.width / width, box.height / height);
      setFit({ scale, x: (box.width - width * scale) / 2, y: (box.height - height * scale) / 2 });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div
        className="absolute top-0 left-0 grid origin-top-left place-items-center"
        style={{ width, height, transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
