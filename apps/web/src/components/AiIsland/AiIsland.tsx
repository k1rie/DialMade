"use client";

import { ISLAND_BLEED, ParentMessageSchema, type IslandMessage, type ParentMessage } from "@dialmade/ai-render/protocol";
import { useEffect, useRef, useState } from "react";
import { islandUrl, previewOrigin } from "@/lib/ai/render/preview";
import { useIslandMessages } from "./useIslandMessages";

export type AiIslandProps = {
  blockId: string;
  /** Sanitized HTML of the block (stored `AiBlock.html`). */
  html: string;
  /** Compiled CSS of the document's AI blocks (src/lib/ai/render/worker.ts). */
  css: string;
  /** Theme variables of the doc in `mode` (`compileThemeVars`). Live: a palette or mode change repaints. */
  vars: Readonly<Record<string, string>>;
  mode: "light" | "dark";
  fontsHref: string | null;
  /** Ajustar: selection and inline text edit on. */
  editable: boolean;
  lang: "es" | "en";
  /** Accessible name of the frame («Bloque Hero, diseñado con IA»). */
  title: string;
  onSelect?: (t: number | null, text: string | null) => void;
  onTextEdit?: (t: number, text: string) => void;
  onNavigate?: (screenId: string) => void;
  onMeasure?: (measure: Extract<IslandMessage, { type: "measure" }>) => void;
  className?: string;
};

/**
 * ONE AI block in its own sandboxed iframe of the preview origin, inside its grid cell (spec §6.1 «una isla por
 * bloque» [C21]). `sandbox="allow-scripts"` only: an opaque origin, no forms, popups, modals or top navigation; the
 * preview origin's CSP forbids any network. The iframe takes the cell's width (container queries work), reports its
 * height, and keeps a compensated 24 px margin so shadows are not clipped. Renders nothing when there is no preview
 * origin (the feature is then not offered at all).
 */
export function AiIsland({ blockId, html, css, vars, mode, fontsHref, editable, lang, title, onSelect, onTextEdit, onNavigate, onMeasure, className }: AiIslandProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(0);
  const origin = previewOrigin();
  const [src] = useState(() => (origin && typeof location !== "undefined" ? islandUrl(origin, location.origin) : null));

  const post = (message: ParentMessage) => {
    const target = frame.current?.contentWindow;
    // The sandboxed document has an opaque origin: "*" is the only target that reaches it. Nothing secret is sent.
    if (target && ParentMessageSchema.safeParse(message).success) target.postMessage(message, "*");
  };

  useIslandMessages(frame, blockId, (message) => {
    if (message.type === "ready") setReady(true);
    else if (message.type === "size") setHeight(message.height);
    else if (message.type === "select") onSelect?.(message.t, message.text);
    else if (message.type === "textEdit") onTextEdit?.(message.t, message.text);
    else if (message.type === "navigate") onNavigate?.(message.screenId);
    else if (message.type === "measure") onMeasure?.(message);
  });

  // Content: on ready and whenever the block changes.
  useEffect(() => {
    if (ready) post({ type: "render", v: 1, blockId, html, css, vars: { ...vars }, mode, fontsHref, editable, lang });
    // `vars`/`mode`/`fontsHref` are sent by the theme effect below without re-inserting the HTML.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, blockId, html, css, editable, lang]);

  // Theme: palette, recipe tokens and light/dark repaint live.
  useEffect(() => {
    if (ready) post({ type: "theme", v: 1, vars: { ...vars }, mode, fontsHref });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, vars, mode, fontsHref]);

  if (!src) return null;
  return (
    <iframe
      ref={frame}
      src={src}
      title={title}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      loading="lazy"
      className={className}
      style={{ display: "block", width: `calc(100% + ${ISLAND_BLEED * 2}px)`, height: height || 1, margin: -ISLAND_BLEED, border: 0, background: "transparent", colorScheme: "normal" }}
    />
  );
}
