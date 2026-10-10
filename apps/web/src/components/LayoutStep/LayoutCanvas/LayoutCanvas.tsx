"use client";

import {
  estimateContent,
  getBlockDef,
  isLibraryBlockType,
  type Adjustment,
  type BlockId,
  type Breakpoint,
  type GridRect,
  type LayoutDoc,
  type LayoutFix,
  type LibraryBlockType,
} from "@dialmade/layout";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { layout as layoutText } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { smooth, snappy } from "@/lib/motion";
import { describeAdjustments } from "../adjustments";
import { FRAME_GUTTER_PX, INSPECTOR_NAME_ID, REGION_AUTOFOCUS_ATTR } from "../constants";
import type { Tool } from "../types";
import {
  selectActiveScreen,
  selectActiveScreenId,
  selectSelectedId,
  useActiveScreen,
  useLayoutActions,
  useLayoutEnv,
  useLayoutHistory,
  useLayoutStore,
  useLayoutStoreApi,
  useScreenResponsive,
  useScreenStructure,
  useSelectedId,
} from "../useLayoutStore";
import { AppFrame } from "./AppFrame";
import { BlockFrame, type BlockWarningView } from "./BlockFrame";
import { ADJUSTED_TOAST_ID, CHIP_MIN_PX, Z_ACTIVE } from "./constants";
import { DerivedBanner } from "./DerivedBanner";
import { DrawTool } from "./DrawTool";
import { DropOverlay } from "./DropOverlay";
import { EmptyHint } from "./EmptyHint";
import { FrameBar } from "./FrameBar";
import {
  adjustedIds,
  blockBox,
  blockDepths,
  bottomRow,
  containerFor,
  frameGeometry,
  frameHeightPx,
  frameRows,
  rectKey,
  sameRect,
  stackingZ,
  warningsByBlock,
  withDescendants,
  type KeyboardGrab,
} from "./gestures";
import { GridOverlay } from "./GridOverlay";
import { ResizeHandles } from "./ResizeHandles";
import { regionOutlines, StructureOverlay, type ReadingNumber } from "./StructureOverlay";
import { useCanvasKeyboard } from "./useCanvasKeyboard";
import { useLibraryDrop } from "./useLibraryDrop";
import { usePointerGestures } from "./usePointerGestures";
import { WhatIsThis } from "./WhatIsThis";

export type LayoutCanvasProps = { className?: string };

const EMPTY_LAYOUT: LayoutDoc = { version: 1, columns: 12, rowUnit: 8, blocks: {} };

/** Dot grid of the canvas background (DESIGN-BRIEF: 1 px white dots at 5 %, every 24 px). */
const DOT_GRID = "[background-image:radial-gradient(oklch(1_0_0/0.05)_1px,transparent_1px)] [background-size:24px_24px]";

const shift = (rect: GridRect, dc: number, dr: number): GridRect => ({ ...rect, col: rect.col + dc, row: rect.row + dr });

/** White flash of blocks that were adjusted or just landed (≤200 ms). */
type Flash = { key: number; ids: ReadonlySet<BlockId> };

/**
 * The Layout canvas: the device frame drawn in screen px (no CSS `scale()`; ResizeObserver on the
 * scroller), the dot grid, the column stripes, the app chrome, and the blocks of the active screen in
 * reading order with their stacking. Editar moves and resizes with the pointer (one store write on
 * release) or with the keyboard (Space/Enter grab inside an undo batch); Dibujar draws free blocks (drag
 * or two clicks) and asks «¿Qué es esto?»; Mano pans. Library blocks drop where the pointer is. Drops
 * that the engine adjusts snap with a spring, flash white and offer «Ajustado · Deshacer». Tablet and
 * mobile show the derived layout read-only, with a FLIP from desktop. Everything else (store, env) comes
 * from LayoutStep's context.
 */
export function LayoutCanvas({ className }: LayoutCanvasProps) {
  const t = useDictionary(layoutText);
  const baseId = useId();
  const reduceMotion = useReducedMotion();
  const announceNow = useDndAnnounce();
  // A tick later: the DnD announcer speaks on the same drag end and must not cover the result.
  const announce = useCallback((message: string) => void window.setTimeout(() => announceNow(message), 0), [announceNow]);

  const store = useLayoutStoreApi();
  const actions = useLayoutActions();
  const history = useLayoutHistory();
  const { focusRegion } = useLayoutEnv();
  const screen = useActiveScreen();
  const selectedId = useSelectedId();
  const tool = useLayoutStore((state) => state.tool);
  const device = useLayoutStore((state) => state.device);
  const showStructure = useLayoutStore((state) => state.showStructure);
  const shortcutsEnabled = useLayoutStore((state) => state.shortcutsEnabled);
  const extraRows = useLayoutStore((state) => {
    const id = selectActiveScreenId(state);
    return id ? (state.extraRows[id] ?? 0) : 0;
  });
  const structure = useScreenStructure();
  const responsive = useScreenResponsive();

  const layout = screen?.layout ?? EMPTY_LAYOUT;
  const editable = device === "desktop";
  const derived = editable ? null : (responsive?.[device] ?? null);
  const shell = screen?.kind === "app" ? screen.shell : null;
  const deviceName = t.devices[device];

  /* ---- Geometry: the frame is measured, never scaled. ---- */
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [available, setAvailable] = useState(0);
  const hasScreen = screen !== null;
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // Measured before the first paint: the frame is never shown hidden, and an area that receives focus
    // right after mounting (F6, the template picker) finds its blocks focusable.
    setAvailable(scroller.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setAvailable(scroller.clientWidth));
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [hasScreen]);
  const geometry = useMemo(() => frameGeometry(available, device, shell), [available, device, shell]);
  const { metrics } = geometry;

  /* ---- Live state that never reaches the store until a release / drop ---- */
  const [grab, setGrabState] = useState<KeyboardGrab | null>(null);
  const grabRef = useRef<KeyboardGrab | null>(null);
  const setGrab = useCallback((next: KeyboardGrab | null) => {
    grabRef.current = next;
    setGrabState(next);
  }, []);

  // Springs: snappy for edits and adjustments, smooth for the FLIP between devices.
  const [spring, setSpring] = useState<{ device: Breakpoint; kind: "snappy" | "smooth" }>({ device, kind: "snappy" });
  if (spring.device !== device) setSpring({ device, kind: "smooth" });
  const markSnappy = useCallback(() => setSpring((current) => (current.kind === "snappy" ? current : { ...current, kind: "snappy" })), []);
  const layoutTransition = spring.kind === "smooth" ? smooth : snappy;

  const [flash, setFlash] = useState<Flash>(() => ({ key: 0, ids: new Set() }));
  const flashBlocks = useCallback((ids: Iterable<BlockId>) => {
    const set = new Set(ids);
    if (set.size > 0) setFlash((current) => ({ key: current.key + 1, ids: set }));
  }, []);
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        if (state.adjustmentsTick !== previous.adjustmentsTick) flashBlocks(adjustedIds(state.lastAdjustments));
      }),
    [store, flashBlocks],
  );

  /* ---- Store helpers (read at event time) ---- */
  const blockNow = useCallback((id: BlockId) => selectActiveScreen(store.getState())?.layout.blocks[id], [store]);
  const nameOf = useCallback((id: BlockId) => blockNow(id)?.label ?? id, [blockNow]);

  // Selections made on the canvas are already in view; others (layers, inspector) get revealed.
  const selectedHere = useRef(false);
  const select = useCallback(
    (id: BlockId | null) => {
      if (selectSelectedId(store.getState()) === id) return;
      selectedHere.current = true;
      actions.select(id);
    },
    [store, actions],
  );
  useEffect(() => {
    if (selectedHere.current) {
      selectedHere.current = false;
      return;
    }
    const scroller = scrollerRef.current;
    if (!selectedId || !scroller) return;
    const element = scroller.querySelector(`[data-block-id="${CSS.escape(selectedId)}"]`);
    if (!element) return;
    const view = scroller.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    if (box.top >= view.top && box.bottom <= view.bottom) return;
    const top = scroller.scrollTop + (box.top - view.top) - Math.max(24, (view.height - Math.min(box.height, view.height)) / 3);
    scroller.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
  }, [selectedId, reduceMotion]);

  /* ---- Focus ---- */
  const focusBlock = useCallback((id: BlockId): boolean => {
    const element = rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`);
    element?.focus({ preventScroll: true });
    return Boolean(element);
  }, []);
  const focusScroller = useCallback(() => scrollerRef.current?.focus({ preventScroll: true }), []);
  // Focus that must wait for the next render (a block that is about to appear or disappear).
  const pendingFocus = useRef<BlockId | "scroller" | null>(null);
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === "scroller" || !focusBlock(target)) focusScroller();
  });

  /* ---- Feedback: announcements, «Ajustado · Deshacer» ---- */
  const undoNow = useCallback(() => {
    store.temporal.getState().undo();
    announce(t.announce.undone);
  }, [store, announce, t]);

  /** Announces what happened and, when the engine adjusted something, shows «Ajustado · Deshacer». */
  const report = useCallback(
    (message: string, adjustments: readonly Adjustment[]) => {
      const adjusted = describeAdjustments(adjustments, nameOf, t.adjusted);
      announce(adjusted ? `${message} ${adjusted}` : message);
      if (adjusted) toast(t.adjusted.toast, { id: ADJUSTED_TOAST_ID, description: adjusted, action: { label: t.adjusted.undo, onClick: undoNow } });
    },
    [nameOf, announce, t, undoNow],
  );

  /* ---- Edits ---- */
  const commitRect = (id: BlockId, rect: GridRect, kind: "move" | "resize") => {
    markSnappy();
    const adjustments = actions.setRect(id, rect);
    const after = blockNow(id);
    const name = after?.label ?? id;
    const finalRect = after?.rect ?? rect;
    report(kind === "move" ? t.canvas.dropped(name, finalRect) : t.canvas.resized(name, finalRect), adjustments);
  };

  const dropGrab = (held: KeyboardGrab) => {
    if (grabRef.current?.id !== held.id) return;
    setGrab(null);
    const adjustments = sameRect(held.rect, held.start) ? [] : actions.setRect(held.id, held.rect);
    actions.commitBatch();
    const after = blockNow(held.id);
    report(t.canvas.dropped(after?.label ?? held.id, after?.rect ?? held.rect), adjustments);
  };

  const cancelGrab = (held: KeyboardGrab) => {
    if (grabRef.current?.id !== held.id) return;
    setGrab(null);
    actions.cancelBatch();
    announce(t.canvas.canceled(nameOf(held.id), held.start));
  };
  // Unmounting while a block is held (the canvas gives way to the narrow layout): never leave the batch open.
  const abandonGrab = useCallback(() => {
    if (!grabRef.current) return;
    grabRef.current = null;
    actions.cancelBatch();
  }, [actions]);
  useEffect(() => abandonGrab, [abandonGrab]);

  // A drawn box and its «¿Qué es esto?» answer are one undo step: the batch closes with the dialog.
  const [asking, setAsking] = useState<BlockId | null>(null);
  const drawBatch = useRef(false);
  const closeDrawBatch = useCallback(() => {
    if (!drawBatch.current) return;
    drawBatch.current = false;
    actions.commitBatch();
  }, [actions]);
  useEffect(() => closeDrawBatch, [closeDrawBatch]);

  const createDrawn = (rect: GridRect) => {
    if (!screen) return;
    markSnappy();
    actions.beginBatch();
    drawBatch.current = true;
    const outcome = actions.insertBlock("free", { rect });
    if (!outcome.id) {
      closeDrawBatch();
      return;
    }
    flashBlocks([outcome.id, ...adjustedIds(outcome.adjustments)]);
    report(t.canvas.drawn(blockNow(outcome.id)?.rect ?? rect), outcome.adjustments);
    actions.setTool("edit");
    setAsking(outcome.id);
  };

  const chooseType = (type: LibraryBlockType) => {
    const id = asking;
    if (!id) return;
    const outcome = actions.updateBlock(id, { type });
    closeDrawBatch();
    setAsking(null);
    if (outcome.nav) {
      announce(t.whatIsThis.frameChosen(t.nav[outcome.nav]));
      pendingFocus.current = "scroller";
    } else {
      announce(t.whatIsThis.chosen(t.blocks[type].name));
      pendingFocus.current = id;
    }
  };
  const keepFree = () => {
    closeDrawBatch();
    pendingFocus.current = asking;
    setAsking(null);
    announce(t.whatIsThis.keptFree);
  };
  const dismissAsking = () => {
    closeDrawBatch();
    setAsking(null);
  };

  const onLibraryDrop = (type: LibraryBlockType, rect: GridRect | null) => {
    if (!screen || !editable) return;
    markSnappy();
    const outcome = actions.insertBlock(type, rect ? { rect } : {});
    if (outcome.nav) {
      announce(t.announce.navChanged(t.nav[outcome.nav]));
      return;
    }
    if (!outcome.id) return;
    flashBlocks([outcome.id, ...adjustedIds(outcome.adjustments)]);
    const block = blockNow(outcome.id);
    report(t.announce.inserted(block?.label ?? t.blocks[type].name, block?.rect ?? rect ?? { col: 0, row: 0, w: 1, h: 1 }), outcome.adjustments);
  };

  const removeBlock = (id: BlockId, order: readonly BlockId[]) => {
    const block = blockNow(id);
    if (!block) return;
    const removed = actions.removeBlocks([id]);
    if (removed.length === 0) return;
    const gone = new Set(removed);
    const index = order.indexOf(id);
    const next = order.slice(index + 1).find((other) => !gone.has(other)) ?? order.slice(0, Math.max(0, index)).reverse().find((other) => !gone.has(other));
    const message = removed.length > 1 ? t.announce.removedMany(removed.length) : t.announce.removed(block.label);
    announce(message);
    toast(message, { action: { label: t.adjusted.undo, onClick: undoNow } });
    pendingFocus.current = next ?? "scroller";
  };

  const applyFixRef = useRef<(fix: LayoutFix, label: string, id: BlockId) => void>(() => {});
  useLayoutEffect(() => {
    applyFixRef.current = (fix, label, id) => {
      if (!actions.applyFix(fix)) return;
      announce(t.announce.fixApplied(label, nameOf(id)));
      pendingFocus.current = id;
    };
  });
  const onApplyFix = useCallback((fix: LayoutFix, label: string, id: BlockId) => applyFixRef.current(fix, label, id), []);

  /* ---- Pointer gestures and library drops ---- */
  const { gesture, anchor, onPointerDown } = usePointerGestures(scrollerRef, gridRef, {
    screenId: screen?.id ?? "",
    tool,
    editable,
    layout,
    metrics,
    select,
    focusBlock,
    focusScroller,
    commitRect,
    createDrawn,
    beforeGesture: () => {
      if (grabRef.current) dropGrab(grabRef.current);
      markSnappy();
    },
    announceAnchor: (state) => announce(state === "set" ? t.canvas.drawStart : t.canvas.drawCanceled),
  });

  const drop = useLibraryDrop({
    enabled: hasScreen && editable,
    label: screen ? t.canvas.region(screen.name) : t.regions.canvas,
    gridRef,
    metrics,
    onDrop: onLibraryDrop,
  });
  const dropRef = drop.ref;
  const setGrid = useCallback(
    (element: HTMLDivElement | null) => {
      gridRef.current = element;
      dropRef(element);
    },
    [dropRef],
  );

  /* ---- What to draw ---- */
  const order = useMemo(() => {
    if (derived) return derived.order;
    const ids = (structure?.order ?? []).filter((id) => layout.blocks[id]);
    const seen = new Set(ids);
    const rest = Object.keys(layout.blocks).filter((id) => !seen.has(id)).sort();
    return rest.length > 0 ? [...ids, ...rest] : ids;
  }, [derived, structure, layout]);

  const depths = useMemo(() => blockDepths(layout), [layout]);
  const grabId = grab?.id ?? null;
  const grabFollowers = useMemo(() => (grabId ? withDescendants(layout, grabId) : null), [grabId, layout]);

  const chipTexts = useMemo(() => {
    const out = new Map<BlockId, string>();
    for (const [id, block] of Object.entries(layout.blocks)) {
      const type = isLibraryBlockType(block.type) ? block.type : "free";
      const estimate = estimateContent(block, layout, id);
      if (estimate) out.set(id, t.canvas.chip(t.blocks[type].name, t.estimate(estimate)));
      else if (getBlockDef(type).overlay) out.set(id, t.canvas.overlays);
    }
    return out;
  }, [layout, t]);

  const warningViews = useMemo(() => {
    const out = new Map<BlockId, BlockWarningView[]>();
    if (!structure || !editable) return out;
    const label = (id: BlockId) => layout.blocks[id]?.label ?? id;
    for (const [id, warnings] of warningsByBlock(structure.warnings)) {
      out.set(
        id,
        warnings.map((warning, index) => ({
          key: `${warning.code}:${warning.ids.join(",")}:${index}`,
          message: t.warnings[warning.code](warning.ids.map(label)),
          fixes: warning.fixes.map((fix, fixIndex) => ({ key: `${fix.kind}:${fixIndex}`, label: t.fixes[fix.kind], fix })),
        })),
      );
    }
    return out;
  }, [structure, editable, layout, t]);

  const activeId = gesture && (gesture.kind === "move" || gesture.kind === "resize") ? gesture.id : grabId;
  const rectFor = (id: BlockId): GridRect | null => {
    if (derived) return derived.blocks[id]?.rect ?? null;
    const block = layout.blocks[id];
    if (!block) return null;
    if (gesture && (gesture.kind === "move" || gesture.kind === "resize") && gesture.id === id) return gesture.rect;
    if (gesture?.kind === "move" && gesture.followers.has(id)) return shift(block.rect, gesture.rect.col - gesture.start.col, gesture.rect.row - gesture.start.row);
    if (grab) {
      if (grab.id === id) return grab.rect;
      if (grabFollowers?.has(id) && grab.rect.w === grab.start.w && grab.rect.h === grab.start.h) {
        return shift(block.rect, grab.rect.col - grab.start.col, grab.rect.row - grab.start.row);
      }
    }
    return block.rect;
  };

  // The moving / held block rises above the rest together with its descendants (kept in their order).
  const lifted = (id: BlockId) =>
    id === activeId || (gesture?.kind === "move" && gesture.followers.has(id)) || (grabFollowers?.has(id) ?? false);
  const items = order.flatMap((id) => {
    const block = layout.blocks[id];
    const rect = rectFor(id);
    if (!block || !rect) return [];
    const box = blockBox(rect, metrics);
    const z = stackingZ(depths.get(id) ?? 0, block.z);
    return [{ id, block, rect, box, zIndex: lifted(id) ? Z_ACTIVE + z : z }];
  });
  const selectedItem = editable && tool === "edit" && !grab ? items.find((item) => item.id === selectedId) : undefined;

  const dropTarget = (() => {
    if (!editable) return null;
    if (gesture?.kind === "move") return containerFor(layout, gesture.rect, gesture.followers);
    if (gesture?.kind === "resize") return containerFor(layout, gesture.rect, withDescendants(layout, gesture.id));
    if (gesture?.kind === "draw" && gesture.rect) return containerFor(layout, gesture.rect);
    if (grab) return containerFor(layout, grab.rect, grabFollowers ?? undefined);
    if (drop.ghost) return containerFor(layout, drop.ghost.rect);
    return null;
  })();

  const drawRect = gesture?.kind === "draw" ? gesture.rect : null;
  const frameDrop = drop.draggedType !== null && screen?.kind === "app" ? getBlockDef(drop.draggedType).frame : null;
  const ghost = drop.ghost && !frameDrop ? { ...blockBox(drop.ghost.rect, metrics), label: t.blocks[drop.ghost.type].name } : null;
  const dropHint = frameDrop
    ? t.canvas.dropFrame(t.nav[frameDrop])
    : dropTarget && drop.ghost
      ? t.canvas.dropInside(layout.blocks[dropTarget]?.label ?? "")
      : t.canvas.dropHere;

  const rows = frameRows(bottomRow([...items.map((item) => item.rect), drawRect, drop.ghost?.rect]), editable ? extraRows : 0);
  const frameHeight = frameHeightPx(geometry, rows);
  const gridHeight = rows * metrics.rowPx;

  const outlines = useMemo(() => (showStructure && editable && structure ? regionOutlines(structure.root) : []), [showStructure, editable, structure]);
  const numbers: ReadingNumber[] = showStructure ? items.map((item, index) => ({ id: item.id, left: item.box.left, top: item.box.top, n: index + 1 })) : [];

  const hiddenHere = derived
    ? (structure?.order ?? []).filter((id) => derived.blocks[id]?.hidden && layout.blocks[id]).map((id) => ({ id, name: layout.blocks[id]!.label }))
    : [];

  const autoFocusId = selectedId && items.some((item) => item.id === selectedId) ? selectedId : (items[0]?.id ?? null);
  const gestureActive = (gesture !== null && gesture.kind !== "pan") || grab !== null || drop.state !== "idle";
  const askingBlock = asking && editable ? layout.blocks[asking] : undefined;

  /* ---- Keyboard ---- */
  const keyboard = useCanvasKeyboard({
    rootRef,
    rectOf: (id) => (derived ? (derived.blocks[id]?.rect ?? null) : (layout.blocks[id]?.rect ?? null)),
    editable,
    columns: metrics.columns,
    selectedId,
    grab,
    shortcutsEnabled,
    actions: {
      readOnly: (id) => {
        select(id);
        announce(t.canvas.readOnly(deviceName));
      },
      grab: (step) => {
        if (grabRef.current) return;
        markSnappy();
        select(step.grab.id);
        actions.beginBatch();
        setGrab(step.grab);
        announce(t.canvas.grabbed(nameOf(step.grab.id)));
      },
      nudge: (step) => {
        setGrab(step.grab);
        const name = nameOf(step.grab.id);
        announce(step.type === "resize" ? t.canvas.resized(name, step.grab.rect) : t.canvas.moved(name, step.grab.rect));
      },
      drop: dropGrab,
      cancel: cancelGrab,
      remove: (id) => removeBlock(id, order),
      duplicate: (id) => {
        const copy = actions.duplicateBlock(id);
        if (!copy) return;
        flashBlocks([copy]);
        announce(t.announce.duplicated(nameOf(id)));
        pendingFocus.current = copy;
      },
      rename: () => {
        // Like F2 in the layers: the name is selected, ready to be typed over.
        const focusName = () => {
          const field = document.getElementById(INSPECTOR_NAME_ID);
          if (!(field instanceof HTMLInputElement)) return false;
          field.focus();
          field.select();
          return true;
        };
        if (!focusName()) requestAnimationFrame(focusName);
      },
      undo: () => {
        if (!history.canUndo) return;
        history.undo();
        announce(t.announce.undone);
      },
      redo: () => {
        if (!history.canRedo) return;
        history.redo();
        announce(t.announce.redone);
      },
      setTool: (next: Tool) => {
        actions.setTool(next);
        announce(t.announce.toolChanged(t.tools[next].label));
      },
      deselect: () => {
        select(null);
        announce(t.announce.deselected);
      },
    },
  });

  // Selection follows focus: Tab through the blocks and the inspector shows the focused one.
  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const id = target.getAttribute("data-block-id");
    if (id && rootRef.current?.contains(target)) select(id);
  };

  if (!screen) return null;

  const instructionsId = `${baseId}-instructions`;
  const derivedId = `${baseId}-derived`;
  const empty = Object.keys(layout.blocks).length === 0;

  return (
    <div
      ref={rootRef}
      className={cn("relative flex min-h-0 flex-1 flex-col gap-2", className)}
      onKeyDown={keyboard.onKeyDown}
      onBlur={keyboard.onBlur}
      onFocus={onFocus}
    >
      {derived && (
        <DerivedBanner
          descriptionId={derivedId}
          deviceName={deviceName}
          hidden={hiddenHere}
          onEditDesktop={() => {
            actions.setDevice("desktop");
            announce(t.announce.deviceChanged(t.devices.desktop));
          }}
          onSelect={(id) => {
            select(id);
            focusRegion("inspector");
          }}
        />
      )}
      <motion.div
        ref={scrollerRef}
        layoutScroll
        tabIndex={-1}
        {...(items.length === 0 && { [REGION_AUTOFOCUS_ATTR]: "" })}
        onPointerDown={onPointerDown}
        className={cn(
          // Stable gutter: the scrollbar appearing must not change the measured width (and the frame's).
          "relative min-h-[24rem] flex-1 overflow-auto overscroll-contain rounded-panel border border-app bg-app/70 [scrollbar-gutter:stable]",
          DOT_GRID,
          tool === "hand" && "touch-none",
          tool === "hand" && (gesture?.kind === "pan" ? "cursor-grabbing" : "cursor-grab"),
        )}
      >
        <div className="mx-auto pb-28" style={{ width: geometry.frameWidth, paddingTop: FRAME_GUTTER_PX, visibility: available > 0 ? "visible" : "hidden" }}>
          <FrameBar size={t.canvas.frameSize(deviceName, geometry.deviceWidth)} grid={t.canvas.grid(metrics.columns)} />
          <div className="relative rounded-b-[12px] border border-t-0 border-app-strong bg-app shadow-lift" style={{ height: frameHeight }}>
            {shell && <AppFrame geometry={geometry} navName={t.nav[shell.nav]} onActivate={() => {
              select(null);
              focusRegion("inspector");
            }} />}
            <div
              ref={setGrid}
              className={cn("absolute select-none", tool === "draw" && editable && "cursor-crosshair touch-none")}
              style={{ left: geometry.content.left, top: geometry.content.top, width: geometry.content.width, height: gridHeight }}
            >
              <GridOverlay columns={metrics.columns} colPx={metrics.colPx} rowPx={metrics.rowPx} active={gestureActive} />
              {items.map((item) => {
                const chip = chipTexts.get(item.id) ?? null;
                const roomy = item.box.width >= CHIP_MIN_PX.width && item.box.height >= CHIP_MIN_PX.height;
                return (
                  <BlockFrame
                    key={item.id}
                    id={item.id}
                    block={item.block}
                    rect={item.rect}
                    left={item.box.left}
                    top={item.box.top}
                    width={item.box.width}
                    height={item.box.height}
                    zIndex={item.zIndex}
                    selected={item.id === selectedId}
                    active={item.id === activeId}
                    grabbed={item.id === grabId}
                    dropTarget={item.id === dropTarget}
                    editable={editable}
                    tool={tool}
                    autoFocus={item.id === autoFocusId}
                    chip={roomy ? chip : null}
                    warnings={warningViews.get(item.id)}
                    flashKey={flash.ids.has(item.id) ? flash.key : 0}
                    layoutKey={`${device}:${rectKey(item.rect)}`}
                    layoutTransition={layoutTransition}
                    describedBy={editable ? instructionsId : derivedId}
                    onApplyFix={onApplyFix}
                  />
                );
              })}
              {selectedItem && (
                <ResizeHandles
                  blockId={selectedItem.id}
                  left={selectedItem.box.left}
                  top={selectedItem.box.top}
                  width={selectedItem.box.width}
                  height={selectedItem.box.height}
                />
              )}
              <AnimatePresence>
                {showStructure && <StructureOverlay key="structure" outlines={outlines} metrics={metrics} numbers={numbers} />}
              </AnimatePresence>
              {editable && <DrawTool box={drawRect ? blockBox(drawRect, metrics, 1) : null} anchor={anchor} anchorHint={t.canvas.drawStart} />}
              <DropOverlay state={drop.state} ghost={ghost} hint={dropHint} />
              {empty && editable && drop.state === "idle" && !drawRect && <EmptyHint />}
            </div>
          </div>
          {editable && (
            <div className="mt-3 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                data-canvas-ignore=""
                aria-label={t.canvas.addSpaceLabel}
                onClick={() => {
                  actions.addSpace(screen.id);
                  announce(t.announce.spaceAdded);
                }}
              >
                {t.canvas.addSpace}
              </Button>
            </div>
          )}
        </div>
      </motion.div>
      <p id={instructionsId} className="sr-only">
        {t.canvas.instructions}
      </p>
      {askingBlock && asking && (
        <WhatIsThis
          key={asking}
          blockId={asking}
          rect={askingBlock.rect}
          layout={layout}
          kind={screen.kind}
          getAnchor={() => (asking ? (rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(asking)}"]`) ?? null) : null)}
          onChoose={chooseType}
          onKeepFree={keepFree}
          onDismiss={dismissAsking}
        />
      )}
    </div>
  );
}
