"use client";

import type { BlockId, GridRect, LayoutDoc } from "@dialmade/layout";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { GridMetrics, Handle, Point } from "@/lib/geometry";
import type { Tool } from "../types";
import { RESIZE_FOR_ATTR } from "./ResizeHandles";
import {
  drawGesture,
  edgeScrollStep,
  fromGridUnits,
  moveGesture,
  panScroll,
  pastThreshold,
  promoteToMove,
  relativePoint,
  resizeGesture,
  sameRect,
  toGridUnits,
} from "./gestures";

/** What the canvas draws while a pointer gesture runs (the store is only written on release). */
export type GestureView =
  | { kind: "move"; id: BlockId; start: GridRect; rect: GridRect; followers: ReadonlySet<BlockId> }
  | { kind: "resize"; id: BlockId; start: GridRect; rect: GridRect }
  | { kind: "draw"; rect: GridRect | null }
  | { kind: "pan" };

/** Latest canvas facts and callbacks; read at event time, so the handlers stay stable. */
export type PointerGestureContext = {
  screenId: string;
  tool: Tool;
  /** Desktop: blocks move, resize and get drawn. Derived views only select. */
  editable: boolean;
  layout: LayoutDoc;
  /** The active screen's layout as the store has it NOW (after a keyboard grab was dropped and committed). */
  readLayout: () => LayoutDoc;
  metrics: GridMetrics;
  select: (id: BlockId | null) => void;
  focusBlock: (id: BlockId) => void;
  focusScroller: () => void;
  /** One `setRect` on release (+ adjustments feedback). */
  commitRect: (id: BlockId, rect: GridRect, kind: "move" | "resize") => void;
  /** A finished drawing: insert the free block and ask «¿Qué es esto?». */
  createDrawn: (rect: GridRect) => void;
  /** A gesture is about to start: drop a keyboard-held block, use snappy springs. */
  beforeGesture: () => void;
  announceAnchor: (state: "set" | "cleared") => void;
};

type Session = {
  pointerId: number;
  /** Where the pointer went down, client px (threshold) and grid-relative px (deltas). */
  originClient: Point;
  origin: Point;
  lastClient: Point;
  cleanup: () => void;
} & (
  // A press on a block: the start rect is only read when it becomes a move (`promoteToMove`).
  | { kind: "pending"; id: BlockId }
  | { kind: "move"; id: BlockId; start: GridRect; followers: ReadonlySet<BlockId>; rect: GridRect }
  | { kind: "resize"; id: BlockId; start: GridRect; handle: Handle; rect: GridRect }
  | { kind: "draw"; dragged: boolean; rect: GridRect | null }
  | { kind: "pan"; scroll: { left: number; top: number } }
);

/** What a gesture starts with (the listeners and the last pointer position are added by `startSession`). */
type SessionInit = Session extends infer S ? (S extends Session ? Omit<S, "cleanup" | "lastClient"> : never) : never;

/** Two-click drawing anchor, in grid units (it survives a resize of the frame), per screen. */
type Anchor = { screenId: string; units: Point };

const HANDLES = new Set<string>(["n", "s", "e", "w", "ne", "nw", "se", "sw"]);
const isHandle = (value: string | null): value is Handle => value !== null && HANDLES.has(value);

/**
 * Pointer gestures of the canvas, by event delegation on the scroller: Editar moves a block (after 3 px)
 * or resizes it from a handle; Dibujar draws a snapped box by dragging or with two clicks; Mano pans
 * the scroller. The live preview is local state that only changes when the snapped rect changes, the
 * pointer is captured, the scroller auto-scrolls near its edges, Esc cancels, and the store gets ONE
 * write on release.
 */
export function usePointerGestures(
  scrollerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  context: PointerGestureContext,
) {
  const ctxRef = useRef(context);
  useLayoutEffect(() => {
    ctxRef.current = context;
  });

  const sessionRef = useRef<Session | null>(null);
  const [gesture, setGesture] = useState<GestureView | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const anchorRef = useRef<Anchor | null>(null);
  useLayoutEffect(() => {
    anchorRef.current = anchor;
  });

  // The anchor only lives while drawing on the screen where it was set.
  const anchorVisible = anchor !== null && context.tool === "draw" && context.editable && anchor.screenId === context.screenId;
  if (anchor !== null && !anchorVisible) setAnchor(null);

  const clearAnchor = useCallback((announce: boolean) => {
    if (!anchorRef.current) return;
    anchorRef.current = null;
    setAnchor(null);
    if (announce) ctxRef.current.announceAnchor("cleared");
  }, []);

  // Esc clears the first corner of a two-click drawing, wherever focus is.
  useEffect(() => {
    if (!anchorVisible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || sessionRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      clearAnchor(true);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [anchorVisible, clearAnchor]);

  const endSession = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    session.cleanup();
    setGesture(null);
  }, []);

  // A gesture never outlives the canvas.
  useEffect(() => () => sessionRef.current?.cleanup(), []);

  /** Grid-relative point of a client point (reads the grid's current box: scrolling moves it). */
  const toGrid = (client: Point): Point | null => {
    const box = contentRef.current?.getBoundingClientRect();
    return box ? relativePoint(client, box) : null;
  };

  /** Recomputes the session's preview for a pointer position; renders only when the snapped rect changes. */
  const update = (session: Session, client: Point) => {
    session.lastClient = client;
    const { metrics, layout } = ctxRef.current;
    if (session.kind === "pan") {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const next = panScroll(session.scroll, session.originClient, client);
      scroller.scrollLeft = next.left;
      scroller.scrollTop = next.top;
      return;
    }
    const point = toGrid(client);
    if (!point) return;
    let started = false;
    if (session.kind === "pending") {
      if (!pastThreshold(session.originClient, client) || !layout.blocks[session.id]) return;
      // Past the threshold: the press becomes a move. A keyboard-held block is dropped first, and only then
      // is the start rect read (from the store), so the move continues from where the block is shown.
      const ctx = ctxRef.current;
      const move = promoteToMove(session.id, ctx.beforeGesture, ctx.readLayout);
      if (!move) {
        endSession();
        return;
      }
      Object.assign(session, { kind: "move", start: move.start, rect: move.start, followers: move.followers });
      started = true;
    }
    if (session.kind === "move") {
      const rect = moveGesture(session.start, session.origin, point, metrics);
      if (!started && sameRect(rect, session.rect)) return;
      session.rect = rect;
      setGesture({ kind: "move", id: session.id, start: session.start, rect, followers: session.followers });
    } else if (session.kind === "resize") {
      const rect = resizeGesture(session.start, session.handle, session.origin, point, metrics);
      if (sameRect(rect, session.rect)) return;
      session.rect = rect;
      setGesture({ kind: "resize", id: session.id, start: session.start, rect });
    } else if (session.kind === "draw") {
      if (!session.dragged && !pastThreshold(session.originClient, client)) return;
      if (!session.dragged) {
        session.dragged = true;
        clearAnchor(false);
      }
      const rect = drawGesture(session.origin, point, metrics);
      if (session.rect && sameRect(rect, session.rect)) return;
      session.rect = rect;
      setGesture({ kind: "draw", rect });
    }
  };

  const finish = (session: Session, client: Point) => {
    const ctx = ctxRef.current;
    switch (session.kind) {
      case "move":
        if (!sameRect(session.rect, session.start)) ctx.commitRect(session.id, session.rect, "move");
        break;
      case "resize":
        if (!sameRect(session.rect, session.start)) ctx.commitRect(session.id, session.rect, "resize");
        break;
      case "draw": {
        if (session.dragged && session.rect) {
          ctx.createDrawn(session.rect);
          break;
        }
        // Two-click alternative: the first click sets a corner, the second one the opposite corner.
        const point = toGrid(client);
        if (!point) break;
        const current = anchorRef.current;
        if (current && current.screenId === ctx.screenId) {
          clearAnchor(false);
          ctx.createDrawn(drawGesture(fromGridUnits(current.units, ctx.metrics), point, ctx.metrics));
        } else {
          const next = { screenId: ctx.screenId, units: toGridUnits(point, ctx.metrics) };
          anchorRef.current = next;
          setAnchor(next);
          ctx.announceAnchor("set");
        }
        break;
      }
      default:
        break;
    }
  };

  const startSession = (event: ReactPointerEvent<HTMLElement>, init: SessionInit) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const pointerId = event.pointerId;
    try {
      scroller.setPointerCapture(pointerId);
    } catch {
      // Capture is a nicety (keeps events when leaving the window); the window listeners still work.
    }
    let frame = 0;
    const stopScroll = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const tick = () => {
      const session = sessionRef.current;
      if (!session || session.kind === "pan") return stopScroll();
      const box = scroller.getBoundingClientRect();
      const step = edgeScrollStep(session.lastClient.y, box);
      if (step === 0) return stopScroll();
      scroller.scrollTop += step;
      update(session, session.lastClient);
      frame = requestAnimationFrame(tick);
    };
    const onMove = (moveEvent: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || moveEvent.pointerId !== pointerId) return;
      const client = { x: moveEvent.clientX, y: moveEvent.clientY };
      update(session, client);
      if (!frame && session.kind !== "pan" && session.kind !== "pending" && edgeScrollStep(client.y, scroller.getBoundingClientRect()) !== 0) {
        frame = requestAnimationFrame(tick);
      }
    };
    const onUp = (upEvent: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || upEvent.pointerId !== pointerId) return;
      const client = { x: upEvent.clientX, y: upEvent.clientY };
      update(session, client);
      endSession();
      finish(session, client);
    };
    // Wheel scrolling mid-gesture moves the grid under a still pointer: follow it.
    const onScroll = () => {
      const session = sessionRef.current;
      if (session && session.kind !== "pan") update(session, session.lastClient);
    };
    const onCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === pointerId) endSession();
    };
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== "Escape") return;
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      endSession();
    };
    const cleanup = () => {
      stopScroll();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKeyDown, true);
      scroller.removeEventListener("scroll", onScroll);
      try {
        if (scroller.hasPointerCapture(pointerId)) scroller.releasePointerCapture(pointerId);
      } catch {
        // Already released (element gone or capture lost).
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKeyDown, true);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    sessionRef.current = { ...init, lastClient: init.originClient, cleanup } as Session;
  };

  /** Delegated pointerdown on the scroller. */
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const scroller = scrollerRef.current;
    const target = event.target as Element | null;
    // React bubbles events from portals (popovers, «¿Qué es esto?»): only real canvas DOM counts.
    if (!scroller || !target || !scroller.contains(target)) return;
    if (event.button !== 0 || !event.isPrimary || sessionRef.current) return;
    if (target.closest("[data-canvas-ignore]")) return;
    const ctx = ctxRef.current;
    const originClient = { x: event.clientX, y: event.clientY };
    const content = contentRef.current;
    const inContent = content?.contains(target) ?? false;
    const origin = toGrid(originClient) ?? { x: 0, y: 0 };

    if (ctx.tool === "hand") {
      event.preventDefault();
      ctx.beforeGesture();
      startSession(event, { kind: "pan", pointerId: event.pointerId, originClient, origin, scroll: { left: scroller.scrollLeft, top: scroller.scrollTop } });
      setGesture({ kind: "pan" });
      return;
    }

    if (ctx.tool === "draw" && ctx.editable) {
      if (!inContent) return;
      event.preventDefault();
      ctx.beforeGesture();
      ctx.focusScroller();
      startSession(event, { kind: "draw", pointerId: event.pointerId, originClient, origin, dragged: false, rect: null });
      return;
    }

    // Editar (or any tool on a read-only derived view): select; on desktop, move or resize.
    const handleEl = ctx.editable ? target.closest("[data-resize-handle]") : null;
    const layer = handleEl?.closest<HTMLElement>(`[${RESIZE_FOR_ATTR}]`);
    const handle = handleEl?.getAttribute("data-resize-handle") ?? null;
    if (layer && isHandle(handle)) {
      const id = layer.getAttribute(RESIZE_FOR_ATTR) ?? "";
      if (!ctx.layout.blocks[id]) return;
      event.preventDefault();
      ctx.beforeGesture();
      // Read after `beforeGesture` (it may commit a held block): never resize from a stale rect.
      const block = ctx.readLayout().blocks[id];
      if (!block) return;
      ctx.focusBlock(id);
      startSession(event, { kind: "resize", pointerId: event.pointerId, originClient, origin, id, start: block.rect, handle, rect: block.rect });
      setGesture({ kind: "resize", id, start: block.rect, rect: block.rect });
      return;
    }

    const blockEl = target.closest<HTMLElement>("[data-block-id]");
    const id = blockEl?.getAttribute("data-block-id");
    if (id) {
      event.preventDefault();
      ctx.select(id);
      ctx.focusBlock(id);
      const block = ctx.layout.blocks[id];
      if (!ctx.editable || ctx.tool !== "edit" || !block) return;
      startSession(event, { kind: "pending", pointerId: event.pointerId, originClient, origin, id });
      return;
    }

    // Empty frame or the space around it.
    ctx.select(null);
    ctx.focusScroller();
  };

  return {
    gesture,
    /** First corner of a two-click drawing, in screen px relative to the grid. */
    anchor: anchorVisible && anchor ? fromGridUnits(anchor.units, context.metrics) : null,
    onPointerDown,
    cancelGesture: endSession,
  };
}
