"use client";

import { pinViewportUnits } from "@dialmade/ai-render";
import { ISLAND_BLEED, ParentMessageSchema, type IslandMessage, type ParentMessage } from "@dialmade/ai-render/protocol";
import { useEffect, useMemo, useRef, useState } from "react";
import { islandUrl, previewOrigin } from "@/lib/ai/render/preview";
import { useIslandMessages } from "./useIslandMessages";
import { useViewportWidth } from "./useViewportWidth";

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
  /**
   * Gate 5: the widths of the block's cell on each device (`measureWidths(cellWidths(…))` of
   * src/lib/ai/render/responsive). After every render the island measures the block at each one and answers one
   * `onMeasure` per width (`useResponsiveGate` turns them into the verdict).
   */
  measureWidths?: readonly number[];
  className?: string;
};

/**
 * ONE AI block in its own sandboxed iframe of the preview origin, inside its grid cell (spec §6.1 «una isla por
 * bloque» [C21]). `sandbox="allow-scripts"` only: an opaque origin, no forms, popups, modals or top navigation; the
 * preview origin's CSP forbids any network. The iframe takes the cell's width (container queries work), reports its
 * height, and keeps a compensated 24 px margin so shadows are not clipped. Renders nothing when there is no preview
 * origin (the feature is then not offered at all).
 */
export function AiIsland({ blockId, html, css, vars, mode, fontsHref, editable, lang, title, onSelect, onTextEdit, onNavigate, onMeasure, measureWidths, className }: AiIslandProps) {
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

  // Fluid type (`vw`) sized like the page around the island, not like the iframe (the cell): see pinViewportUnits.
  const viewportWidth = useViewportWidth();
  const pinned = useMemo(() => pinViewportUnits(vars, viewportWidth), [vars, viewportWidth]);

  // Content: on ready and whenever the block changes (then gate 5's measurement, when asked for).
  const widthsKey = measureWidths?.join(",") ?? "";
  useEffect(() => {
    if (!ready) return;
    post({ type: "render", v: 1, blockId, html, css, vars: pinned, mode, fontsHref, editable, lang });
    if (widthsKey) post({ type: "measure", v: 1, widths: widthsKey.split(",").map(Number) });
    // `vars`/`mode`/`fontsHref` are sent by the theme effect below without re-inserting the HTML.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, blockId, html, css, editable, lang, widthsKey]);

  // Theme: palette, recipe tokens and light/dark repaint live.
  useEffect(() => {
    if (ready) post({ type: "theme", v: 1, vars: pinned, mode, fontsHref });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pinned, mode, fontsHref]);

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
      style={{ display: "block", width: `calc(100% + ${ISLAND_BLEED * 2}px)`, height: height || 1, margin: -ISLAND_BLEED, border: 0, background: "transparent", colorScheme: mode }}
    />
  );
}
