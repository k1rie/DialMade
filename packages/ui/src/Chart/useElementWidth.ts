"use client";

import { useCallback, useState } from "react";

/** Ancho del elemento con ResizeObserver; hasta medir (SSR, export estático) usa `fallback`. */
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const [width, setWidth] = useState(fallback);
  const ref = useCallback((node: T | null) => {
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next) setWidth(Math.round(next));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
