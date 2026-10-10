"use client";

import { useEffect, useRef } from "react";

type Handlers = {
  onFile: (file: File) => void;
  /** A bare http(s) URL was pasted outside a text field. */
  onUrl: (url: string) => void;
};

const SVG_MARKUP = /^(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>][\s\S]*<\/svg>$/i;
const URL_TEXT = /^https?:\/\/\S+$/i;

function clipboardFile(data: DataTransfer): File | undefined {
  const file = Array.from(data.files).find((item) => item.type.startsWith("image/"));
  if (file) return file;
  for (const item of Array.from(data.items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const found = item.getAsFile();
      if (found) return found;
    }
  }
  return undefined;
}

const isEditable = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest("input, textarea, [contenteditable]:not([contenteditable='false'])");

/** Cmd/Ctrl+V outside text fields: an image file or SVG markup becomes a logo; a URL is handed to `onUrl`. */
export function useLogoPaste({ onFile, onUrl }: Handlers, enabled = true) {
  const handlers = useRef({ onFile, onUrl });
  useEffect(() => {
    handlers.current = { onFile, onUrl };
  });

  useEffect(() => {
    if (!enabled) return;
    const onPaste = (event: ClipboardEvent) => {
      const data = event.clipboardData;
      if (!data || isEditable(event.target)) return;
      const file = clipboardFile(data);
      if (file) {
        event.preventDefault();
        handlers.current.onFile(file);
        return;
      }
      const text = data.getData("text/plain").trim();
      if (SVG_MARKUP.test(text)) {
        event.preventDefault();
        handlers.current.onFile(new File([text], "pasted.svg", { type: "image/svg+xml" }));
      } else if (URL_TEXT.test(text)) {
        event.preventDefault();
        handlers.current.onUrl(text);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [enabled]);
}
