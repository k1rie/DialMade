"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import type { PreviewDevice } from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { useDictionary } from "@/i18n";
import { composer } from "@/i18n/composer";
import type { DroppedItem } from "@/lib/dnd";
import { canvasLayoutId } from "@/lib/layout-ids";
import { smooth } from "@/lib/motion";
import { DEVICE_WIDTHS } from "../../constants";
import { CanvasDropZone } from "../CanvasDropZone";
import { PagePreview } from "../PagePreview";
import { SelectionToolbar, type SelectionToolbarProps } from "../SelectionToolbar";

const PAD = 24;
const BAR_HEIGHT = 30;

export type CanvasViewportProps = {
  id: string;
  label: string;
  doc: DesignDoc;
  kind: OutputKind;
  mode: PreviewMode;
  device: PreviewDevice;
  logoUrl: string | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDeselect: () => void;
  /** Changes when the selection should scroll into view (picked from the list, moved). */
  revealKey: number;
  onDrop: (item: DroppedItem) => void;
  toolbar: Pick<SelectionToolbarProps, "aiAvailable" | "aiBusy" | "onMove" | "onHide" | "onImproveCopy">;
};

/**
 * The device frame: the page renders at the device width (390/768/1440) and is scaled down with a
 * transform to fit; the sizer reserves the scaled height so the scroll range stays right.
 */
export function CanvasViewport({
  id,
  label,
  doc,
  kind,
  mode,
  device,
  logoUrl,
  selectedId,
  onSelect,
  onDeselect,
  revealKey,
  onDrop,
  toolbar,
}: CanvasViewportProps) {
  const t = useDictionary(composer);
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [available, setAvailable] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);

  const deviceWidth = DEVICE_WIDTHS[device];
  const scale = available > 0 ? Math.min(1, (available - PAD * 2) / deviceWidth) : 0;
  const percent = Math.round(scale * 100);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const frame = frameRef.current;
    if (!scroller || !frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setAvailable(scroller.clientWidth);
      setFrameHeight(frame.offsetHeight);
    });
    observer.observe(scroller);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Switching device: a short settle (≤250 ms, transform + opacity) on the sizer, never on the
  // scaled frame, whose transform is the scale.
  const settleRef = useRef<HTMLDivElement | null>(null);
  const previousDevice = useRef(device);
  useEffect(() => {
    if (previousDevice.current === device) return;
    previousDevice.current = device;
    const sizer = settleRef.current;
    if (!sizer || reduce) return;
    const controls = animate(sizer, { opacity: [0.35, 1], y: [10, 0] }, { duration: 0.25, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [device, reduce]);

  // Bring the selection into view when it was picked outside the canvas (list, move).
  useEffect(() => {
    if (!revealKey || !selectedId) return;
    const scroller = scrollerRef.current;
    const target = scroller?.querySelector(`[data-dl-id="${CSS.escape(selectedId)}"]`);
    if (!scroller || !target) return;
    const s = scroller.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    if (r.top >= s.top && r.top <= s.bottom - 48) return;
    scroller.scrollTo({ top: scroller.scrollTop + (r.top - s.top) - 56, behavior: reduce ? "auto" : "smooth" });
  }, [revealKey, selectedId, reduce]);

  const onBackgroundClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget || (event.target as HTMLElement).dataset.canvasBackground !== undefined) onDeselect();
  };

  const content = (
    <div ref={stageRef} className="absolute inset-0 overflow-hidden rounded-[inherit]">
      <div
        ref={scrollerRef}
        id={id}
        role="region"
        aria-label={label}
        className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain [background-image:radial-gradient(oklch(1_0_0/0.05)_1px,transparent_1px)] [background-size:24px_24px]"
        onClick={onBackgroundClick}
      >
        <div
          ref={settleRef}
          data-canvas-background=""
          className="mx-auto"
          style={{ width: deviceWidth * scale, paddingBlock: PAD, visibility: scale ? "visible" : "hidden" }}
        >
          <div
            aria-hidden
            className="flex items-center gap-1.5 rounded-t-[12px] border border-b-0 border-app-strong bg-app-elevated px-3"
            style={{ height: BAR_HEIGHT }}
          >
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
            <span className="ms-auto font-mono text-[11px] text-subtle tabular-nums">
              {deviceWidth} px · {t.canvas.scale(percent)}
            </span>
          </div>
          <div
            className="relative overflow-hidden rounded-b-[12px] border border-t-0 border-app-strong shadow-lift"
            style={{ height: frameHeight * scale }}
          >
            <div ref={frameRef} className="absolute top-0 left-0 origin-top-left" style={{ width: deviceWidth, transform: `scale(${scale})` }}>
              <PagePreview doc={doc} kind={kind} mode={mode} selectedId={selectedId} onSelect={onSelect} logoUrl={logoUrl} />
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {selectedId && (
          <SelectionToolbar
            key={`${kind}:${selectedId}`}
            doc={doc}
            kind={kind}
            id={selectedId}
            logoUrl={logoUrl}
            stageRef={stageRef}
            scrollerRef={scrollerRef}
            onDeselect={onDeselect}
            {...toolbar}
          />
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <CanvasDropZone label={label} hint={t.canvas.dropHere} onDrop={onDrop} className="relative min-h-[60vh] flex-1 rounded-panel lg:min-h-0">
      {/* The frame alone shares `canvasLayoutId` with the mini in «Crear»: it grows into the canvas while
          the page fades in with the step, so the page itself is never stretched. */}
      <motion.div
        aria-hidden
        layoutId={canvasLayoutId}
        layoutDependency={kind}
        transition={smooth}
        className="absolute inset-0 rounded-[inherit] border border-app bg-app/70"
      />
      {content}
    </CanvasDropZone>
  );
}
