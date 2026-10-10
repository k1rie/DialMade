"use client";

import { useEffect, useRef } from "react";

const hasFiles = (event: DragEvent) => !!event.dataTransfer && Array.from(event.dataTransfer.types).includes("Files");

/**
 * Outside the Home (which handles file drops itself) a file dropped on the page must not make the
 * browser navigate away from the work: the drop is swallowed and `onBlocked` explains why.
 */
export function useFileDropGuard(enabled: boolean, onBlocked: () => void) {
  const onBlockedRef = useRef(onBlocked);
  useEffect(() => {
    onBlockedRef.current = onBlocked;
  });

  useEffect(() => {
    if (!enabled) return;
    const onOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      onBlockedRef.current();
    };
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [enabled]);
}
