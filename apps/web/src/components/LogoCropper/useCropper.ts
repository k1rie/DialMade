"use client";

import { animate, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  centerOf,
  clamp,
  computeView,
  constrain,
  drawRect,
  fitScale,
  isArrowKey,
  isVisible,
  moveRect,
  nudgeRect,
  resizeRect,
  squareOf,
  type Handle,
  type Point,
  type Rect,
  type Size,
} from "@/lib/geometry";
import { smooth, snappy } from "@/lib/motion";

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
const STAGE_PAD = 24;
const MIN_SCREEN_SIZE = 20;
const DRAG_THRESHOLD = 3;

type Drag = {
  pointerId: number;
  mode: "move" | "draw" | Handle;
  startX: number;
  startY: number;
  start: Rect;
  origin: Point;
  moved: boolean;
};

type Box = { left: MotionValue<number>; top: MotionValue<number>; width: MotionValue<number>; height: MotionValue<number> };

/**
 * Crop state for LogoCropper. The crop lives in natural image pixels; pointer drags write motion
 * values directly (no React render per move) and keyboard/aspect changes spring to the target.
 * `crop` is the committed rect (end of a drag or key press) for previews and announcements.
 */
export function useCropper(image: Size, initial: Rect) {
  const reduce = useReducedMotion() ?? false;
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef(initial);
  const dragRef = useRef<Drag | null>(null);
  const zoomRef = useRef(ZOOM_MIN);
  const stageSizeRef = useRef<Size | null>(null);
  const interactedRef = useRef(false);

  const [crop, setCrop] = useState(initial);
  const [stage, setStage] = useState<Size | null>(null);
  const [zoom, setZoomState] = useState(ZOOM_MIN);
  const [square, setSquareState] = useState(false);
  const [dragging, setDragging] = useState(false);

  const x = useMotionValue(initial.x);
  const y = useMotionValue(initial.y);
  const w = useMotionValue(initial.w);
  const h = useMotionValue(initial.h);
  const scale = useMotionValue(0);
  const viewX = useMotionValue(0);
  const viewY = useMotionValue(0);

  const screen: Box = {
    left: useTransform(() => viewX.get() + x.get() * scale.get()),
    top: useTransform(() => viewY.get() + y.get() * scale.get()),
    width: useTransform(() => w.get() * scale.get()),
    height: useTransform(() => h.get() * scale.get()),
  };
  const imageBox: Box = {
    left: viewX,
    top: viewY,
    width: useTransform(() => image.w * scale.get()),
    height: useTransform(() => image.h * scale.get()),
  };

  const minSize = stage ? Math.min(image.w, image.h, MIN_SCREEN_SIZE / fitScale(stage, image, STAGE_PAD)) : 1;

  const applyView = useCallback(
    (zoomValue: number, focus: Point, animated: boolean) => {
      const size = stageSizeRef.current;
      if (!size) return;
      const next = computeView(size, image, zoomValue, focus, STAGE_PAD);
      const pairs: [MotionValue<number>, number][] = [
        [scale, next.scale],
        [viewX, next.x],
        [viewY, next.y],
      ];
      for (const [value, target] of pairs) {
        if (animated && !reduce) animate(value, target, smooth);
        else value.jump(target);
      }
    },
    [image, reduce, scale, viewX, viewY],
  );

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const size = { w: entry.contentRect.width, h: entry.contentRect.height };
      stageSizeRef.current = size;
      setStage(size);
      applyView(zoomRef.current, centerOf(cropRef.current), false);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [applyView]);

  const place = useCallback(
    (next: Rect, animated: boolean) => {
      cropRef.current = next;
      const pairs: [MotionValue<number>, number][] = [
        [x, next.x],
        [y, next.y],
        [w, next.w],
        [h, next.h],
      ];
      for (const [value, target] of pairs) {
        if (animated && !reduce) animate(value, target, snappy);
        else value.jump(target);
      }
    },
    [reduce, x, y, w, h],
  );

  const commit = useCallback(() => setCrop({ ...cropRef.current }), []);

  const ensureVisible = useCallback(() => {
    const size = stageSizeRef.current;
    if (!size || zoomRef.current <= ZOOM_MIN) return;
    const view = { scale: scale.get(), x: viewX.get(), y: viewY.get() };
    if (!isVisible(cropRef.current, view, size)) applyView(zoomRef.current, centerOf(cropRef.current), true);
  }, [applyView, scale, viewX, viewY]);

  const setZoom = useCallback(
    (value: number) => {
      const next = clamp(value, ZOOM_MIN, ZOOM_MAX);
      zoomRef.current = next;
      setZoomState(next);
      applyView(next, centerOf(cropRef.current), true);
    },
    [applyView],
  );

  const setSquare = useCallback(
    (on: boolean) => {
      setSquareState(on);
      if (!on) return;
      interactedRef.current = true;
      place(squareOf(cropRef.current, image), true);
      commit();
    },
    [commit, image, place],
  );

  /** Springs to `rect` (e.g. «Ajustar al logo»). */
  const fitTo = useCallback(
    (rect: Rect) => {
      const next = constrain(square ? squareOf(rect, image) : rect, image, 1);
      place(next, true);
      commit();
      if (zoomRef.current > ZOOM_MIN) applyView(zoomRef.current, centerOf(next), true);
    },
    [applyView, commit, image, place, square],
  );

  const hasInteracted = useCallback(() => interactedRef.current, []);
  const getCrop = useCallback(() => cropRef.current, []);

  const toImagePoint = (clientX: number, clientY: number): Point => {
    const box = stageRef.current?.getBoundingClientRect();
    const s = scale.get() || 1;
    return { x: (clientX - (box?.left ?? 0) - viewX.get()) / s, y: (clientY - (box?.top ?? 0) - viewY.get()) / s };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dragRef.current || scale.get() <= 0) return;
    const target = event.target as HTMLElement;
    const handle = target.closest<HTMLElement>("[data-handle]")?.dataset.handle as Handle | undefined;
    const mode: Drag["mode"] = handle ?? (target.closest("[data-crop-body]") ? "move" : "draw");
    const values = [x, y, w, h];
    if (values.some((value) => value.isAnimating())) cropRef.current = { x: x.get(), y: y.get(), w: w.get(), h: h.get() };
    values.forEach((value) => value.stop());
    dragRef.current = {
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      start: { ...cropRef.current },
      origin: toImagePoint(event.clientX, event.clientY),
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    event.preventDefault();
    frameRef.current?.focus({ preventScroll: true });
    interactedRef.current = true;
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const screenX = event.clientX - drag.startX;
    const screenY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(screenX, screenY) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const s = scale.get() || 1;
    const dx = screenX / s;
    const dy = screenY / s;
    let next: Rect;
    if (drag.mode === "move") next = moveRect(drag.start, dx, dy, image);
    else if (drag.mode === "draw") {
      const anchor = { x: clamp(drag.origin.x, 0, image.w), y: clamp(drag.origin.y, 0, image.h) };
      next = drawRect(anchor, { x: drag.origin.x + dx, y: drag.origin.y + dy }, image, minSize, square);
    } else next = resizeRect(drag.start, drag.mode, dx, dy, image, minSize, square);
    place(next, false);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    if (!drag.moved) return;
    commit();
    ensureVisible();
  };

  /**
   * One step towards `key` (an arrow key name): moves, or with `resize` grows/shrinks from the top-left
   * corner. 1 px = one natural pixel, or one screen pixel on large images; `large` is 10 of them.
   */
  const nudge = (key: string, resize: boolean, large: boolean) => {
    interactedRef.current = true;
    const s = scale.get();
    const step = (s > 0 ? Math.max(1, Math.round(1 / s)) : 1) * (large ? 10 : 1);
    place(nudgeRect(cropRef.current, key, step, resize, square, image, minSize), true);
    commit();
    ensureVisible();
  };

  /** Arrows move 1 px (Shift: 10 px); with Alt they resize. */
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isArrowKey(event.key)) return;
    event.preventDefault();
    nudge(event.key, event.altKey, event.shiftKey);
  };

  return {
    stageRef,
    frameRef,
    screen,
    imageBox,
    rect: { x, y, w, h },
    crop,
    zoom,
    setZoom,
    square,
    setSquare,
    dragging,
    fitTo,
    hasInteracted,
    getCrop,
    onKeyDown,
    nudge,
    stageHandlers: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag },
  };
}

export type Cropper = ReturnType<typeof useCropper>;
