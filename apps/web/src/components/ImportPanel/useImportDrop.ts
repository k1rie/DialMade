"use client";

import { useEffect, useRef, useState } from "react";

type Handlers = {
  onFiles: (files: File[]) => void;
  /** Text pasted outside a text field (it goes to «Pegar colores o código»). */
  onText: (text: string) => void;
};

const hasFiles = (event: DragEvent) => !!event.dataTransfer && Array.from(event.dataTransfer.types).includes("Files");

const isEditable = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])");

function clipboardFiles(data: DataTransfer): File[] {
  const files = Array.from(data.files);
  if (files.length > 0) return files;
  return Array.from(data.items)
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}

/**
 * While the panel is open the whole window takes files (a drop anywhere adds them, never navigates
 * away) and Cmd/Ctrl+V adds pasted files or hands pasted text to the paste box. Returns true while
 * files are dragged over the page.
 */
export function useImportDrop({ onFiles, onText }: Handlers): boolean {
  const [over, setOver] = useState(false);
  const handlers = useRef({ onFiles, onText });
  useEffect(() => {
    handlers.current = { onFiles, onText };
  });

  useEffect(() => {
    let depth = 0;
    let safety: ReturnType<typeof setTimeout> | undefined;
    const reset = () => {
      depth = 0;
      clearTimeout(safety);
      setOver(false);
    };
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setOver(true);
    };
    const onOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setOver(true);
      clearTimeout(safety);
      safety = setTimeout(reset, 1000);
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) reset();
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      reset();
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length > 0) handlers.current.onFiles(files);
    };
    const onPaste = (event: ClipboardEvent) => {
      const data = event.clipboardData;
      if (!data) return;
      const files = clipboardFiles(data);
      if (files.length > 0) {
        event.preventDefault();
        handlers.current.onFiles(files);
        return;
      }
      if (isEditable(event.target)) return;
      const text = data.getData("text/plain");
      if (text.trim()) {
        event.preventDefault();
        handlers.current.onText(text);
      }
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    document.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      document.removeEventListener("paste", onPaste);
      clearTimeout(safety);
    };
  }, []);

  return over;
}
