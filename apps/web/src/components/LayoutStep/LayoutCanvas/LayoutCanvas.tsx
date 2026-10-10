"use client";

import {
  estimateContent,
  getBlockDef,
  isLibraryBlockType,
  type Adjustment,
  type BlockId,
  type GridRect,
  type LayoutDoc,
  type LayoutFix,
  type LibraryBlockType,
} from "@dialmade/layout";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import { toast } from "sonner";
import { useDndAnnounce, type DndPoliteness } from "@/components/dnd/DndAnnouncer";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { layout as layoutText } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { canvasLayoutId } from "@/lib/layout-ids";
import { smooth } from "@/lib/motion";
import { describeAdjustments } from "../adjustments";
import { INSPECTOR_NAME_ID, REGION_AUTOFOCUS_ATTR } from "../constants";
import { getResponsive } from "../structureCache";
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
  useScreenStructure,
  useSelectedId,
} from "../useLayoutStore";
import { AppFrame } from "./AppFrame";
import { BlockFrame, buildWarningViews, type BlockWarningView } from "./BlockFrame";
import { ADJUSTED_TOAST_ID, CHIP_MIN_PX, FRAME_GUTTER_PX, Z_ACTIVE } from "./constants";
import { DerivedBanner } from "./DerivedBanner";
import { DrawTool } from "./DrawTool";
import { DropOverlay } from "./DropOverlay";
import { EmptyHint } from "./EmptyHint";
import { FrameBar } from "./FrameBar";
import { GenerateReveal } from "./GenerateReveal";
import {
  adjustedIds,
  askingStillValid,
  blockBox,
  bottomRow,
  containerFor,
  derivedLayoutFor,
  focusAfterChange,
  frameGeometry,
  frameHeightPx,
  frameRows,
  layoutKeyOf,
  nearestSurvivor,
  revealScrollTop,
  sameRect,
  scrollAfterDeviceSwitch,
  stackingOrder,
  warningsByBlock,
  withDescendants,
  type KeyboardGrab,
} from "./gestures";
import { GridOverlay } from "./GridOverlay";
import { ResizeHandles } from "./ResizeHandles";
import { RevealChips } from "./RevealChips";
import { regionOutlines, StructureOverlay, type ReadingNumber } from "./StructureOverlay";
import { useCanvasKeyboard } from "./useCanvasKeyboard";
import { useLibraryDrop } from "./useLibraryDrop";
import { usePointerGestures } from "./usePointerGestures";
import { WhatIsThis } from "./WhatIsThis";

export type LayoutCanvasProps = { className?: string };

const EMPTY_LAYOUT: LayoutDoc = { version: 1, columns: 12, rowUnit: 8, blocks: {} };

/** Element id of the app frame in a screen's page (`SHELL_ELEMENT_ID` of @dialmade/sections). */
const SHELL_ID = "shell";

/** Dot grid of the canvas background (DESIGN-BRIEF: 1 px white dots at 5 %, every 24 px). */
const DOT_GRID = "[background-image:radial-gradient(oklch(1_0_0/0.05)_1px,transparent_1px)] [background-size:24px_24px]";

const shift = (rect: GridRect, dc: number, dr: number): GridRect => ({ ...rect, col: rect.col + dc, row: rect.row + dr });

/** White flash of blocks that were adjusted or just landed (≤200 ms). */
type Flash = { key: number; ids: ReadonlySet<BlockId> };

/** A box in screen px, relative to the grid. */
type Box = { left: number; top: number; width: number; height: number };

/** The open draw batch: what the engine adjusted, offered as «Ajustado · Deshacer» once the batch closes. */
type DrawBatch = { adjusted: string | null };

/**
 * The Layout canvas: the device frame drawn in screen px (no CSS `scale()`; ResizeObserver on the
 * scroller), the dot grid, the column stripes, the app chrome, and the blocks of the active screen in
 * reading order with their stacking. Editar moves and resizes with the pointer (one store write on
 * release) or with the keyboard (Space/Enter grab inside an undo batch); Dibujar draws free blocks (drag
 * or two clicks) and asks «¿Qué es esto?»; Mano pans. Library blocks drop where the pointer is. Drops
 * that the engine adjusts snap with a spring, flash white and offer «Ajustado · Deshacer» (it only undoes
 * while nothing changed since). Tablet and mobile show the derived layout read-only, with a FLIP from
 * desktop. The scroller isolates the canvas stacking: blocks, handles and overlays never paint over the
 * page's floating bar or popovers. Keyboard focus never falls to <body> (undo, redo, deletions), and a
 * block moved or focused by keyboard is scrolled into view. Everything else (store, env) comes from
 * LayoutStep's context.
 */
export function LayoutCanvas({ className }: LayoutCanvasProps) {
  const t = useDictionary(layoutText);
  const baseId = useId();
  const reduceMotion = useReducedMotion();
  const announceNow = useDndAnnounce({ politeness: "polite" });
  // A tick later: the DnD announcer speaks the drop on the same drag end (assertive); the result follows it.
  const announce = useCallback(
    (message: string, politeness?: DndPoliteness) => void window.setTimeout(() => announceNow(message, politeness), 0),
    [announceNow],
  );

  const store = useLayoutStoreApi();
  const actions = useLayoutActions();
  const history = useLayoutHistory();
  const { focusRegion, doc, reveal, endReveal } = useLayoutEnv();
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

  const layout = screen?.layout ?? EMPTY_LAYOUT;
  const editable = device === "desktop";
  // Only tablet and mobile derive (cached per layout version): desktop never pays for it.
  const derived = derivedLayoutFor(screen?.layout ?? null, device, getResponsive);
  const shell = screen?.kind === "app" ? screen.shell : null;
  const deviceName = t.devices[device];
  // «Generar» moment: the generated page under the boxes (the active screen, once the doc has its page). While a
  // moment runs the canvas is a preview: no gestures, no keys, no handles or badges.
  const revealing = reveal !== null;
  const revealHere =
    reveal && reveal.layer && screen && Object.hasOwn(doc.screens, screen.id) ? { ...reveal, play: reveal.phase === "playing" && reveal.screenId === screen.id } : null;

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
  const readLayout = useCallback(() => selectActiveScreen(store.getState())?.layout ?? EMPTY_LAYOUT, [store]);

  /* ---- Scroll: boxes are read from the grid geometry, never from the DOM (FLIP transforms move it) ---- */
  // The boxes and the reading order of the last render (synced in the layout effect below).
  const boxesRef = useRef<ReadonlyMap<BlockId, Box>>(new Map());
  const orderRef = useRef<readonly BlockId[]>([]);
  /** Grid top in the scroller's content px (its scrollTop space). */
  const gridTopInScroller = useCallback(() => {
    const scroller = scrollerRef.current;
    const grid = gridRef.current;
    if (!scroller || !grid) return null;
    return grid.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientTop + scroller.scrollTop;
  }, []);
  const revealBox = useCallback(
    (box: { top: number; height: number }, mode: "nearest" | "third", smoothly: boolean) => {
      const scroller = scrollerRef.current;
      const gridTop = gridTopInScroller();
      if (!scroller || gridTop === null) return;
      const top = revealScrollTop({ scrollTop: scroller.scrollTop, height: scroller.clientHeight }, { top: gridTop + box.top, height: box.height }, mode);
      if (top === null) return;
      if (smoothly) scroller.scrollTo({ top, behavior: "smooth" });
      else scroller.scrollTop = top;
    },
    [gridTopInScroller],
  );

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
    const box = selectedId ? boxesRef.current.get(selectedId) : undefined;
    if (box) revealBox(box, "third", !reduceMotion);
  }, [selectedId, reduceMotion, revealBox]);

  /* ---- Focus ---- */
  const focusBlock = useCallback((id: BlockId): boolean => {
    const element = rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`);
    element?.focus({ preventScroll: true });
    return Boolean(element);
  }, []);
  const focusScroller = useCallback(() => scrollerRef.current?.focus({ preventScroll: true }), []);
  // Focus (and scroll) that must wait for the next render: a block that is about to appear or disappear,
  // a held block that moved. Requesting one always renders, so it never lingers to a later render.
  const pendingFocus = useRef<BlockId | "scroller" | null>(null);
  const pendingReveal = useRef<{ id: BlockId; edge: "box" | "bottom" } | null>(null);
  const [, setFocusTick] = useState(0);
  const requestFocus = useCallback((target: BlockId | "scroller") => {
    pendingFocus.current = target;
    setFocusTick((tick) => tick + 1);
  }, []);
  const requestReveal = useCallback((id: BlockId, edge: "box" | "bottom") => {
    pendingReveal.current = { id, edge };
    setFocusTick((tick) => tick + 1);
  }, []);

  /** The canvas block that has focus, if any. */
  const focusedBlockId = (): BlockId | null => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !rootRef.current?.contains(active)) return null;
    return active.getAttribute("data-block-id");
  };

  /**
   * Runs a history change (undo, redo) and keeps keyboard users on the canvas: when the focused block is
   * gone, focus goes to `prefer`, the selection, the nearest block in reading order or the scroller.
   */
  const changeKeepingFocus = (change: () => boolean, focused: BlockId | "lost" | null, prefer?: BlockId | null): boolean => {
    const previousOrder = orderRef.current;
    if (!change()) return false;
    const state = store.getState();
    const blocks = selectActiveScreen(state)?.layout.blocks ?? {};
    const target = focusAfterChange({ focused, previousOrder, exists: (id) => blocks[id] !== undefined, selected: selectSelectedId(state), prefer });
    if (target) requestFocus(target);
    return true;
  };

  /**
   * «Deshacer» of a toast: undoes only while nothing changed since the action (`token`); else it says so.
   * Focus on the canvas stays on the canvas; focus on the toast (about to close) or on <body> lands on
   * `prefer` (the block brought back), the selection or the scroller. Focus elsewhere is left alone.
   */
  const undoFromToast = (token: number, prefer?: BlockId) => {
    const active = document.activeElement;
    const lost = !active || active === document.body || active.closest("[data-sonner-toaster]") !== null;
    const onCanvas = !lost && (rootRef.current?.contains(active) ?? false);
    const focused = lost ? "lost" : onCanvas ? focusedBlockId() : null;
    const undone = changeKeepingFocus(() => actions.undoIfLatest(token), focused, lost || onCanvas ? prefer : null);
    if (undone) {
      announce(t.announce.undone);
      return;
    }
    toast(t.common.undoStale);
    if (lost) requestFocus(selectSelectedId(store.getState()) ?? "scroller");
  };

  /* ---- Feedback: announcements, «Ajustado · Deshacer» ---- */
  /** «Ajustado · Deshacer» for the change that was just made (the token is read now). */
  const offerAdjustedUndo = (description: string) => {
    const token = actions.changeToken();
    toast(t.adjusted.toast, { id: ADJUSTED_TOAST_ID, description, action: { label: t.adjusted.undo, onClick: () => undoFromToast(token) } });
  };
  const offerAdjustedUndoRef = useRef(offerAdjustedUndo);
  useLayoutEffect(() => {
    offerAdjustedUndoRef.current = offerAdjustedUndo;
  });

  /**
   * Announces what happened and, when the engine adjusted something, shows «Ajustado · Deshacer» (call it
   * right after the change). Returns the description of the adjustments.
   */
  const report = (message: string, adjustments: readonly Adjustment[], offerUndo = true): string | null => {
    const adjusted = describeAdjustments(adjustments, nameOf, t.adjusted);
    announce(adjusted ? `${message} ${adjusted}` : message);
    if (adjusted && offerUndo) offerAdjustedUndo(adjusted);
    return adjusted;
  };

  /* ---- Edits ---- */
  const commitRect = (id: BlockId, rect: GridRect, kind: "move" | "resize") => {
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

  // A drawn box and its «¿Qué es esto?» answer are one undo step: the batch closes with the dialog. Its
  // «Ajustado · Deshacer» waits for the batch to close, so it undoes the whole step.
  const [asking, setAsking] = useState<BlockId | null>(null);
  const askingRef = useRef<BlockId | null>(null);
  useLayoutEffect(() => {
    askingRef.current = asking;
  });
  const drawBatch = useRef<DrawBatch | null>(null);
  const closeDrawBatch = useCallback(
    (offerUndo: boolean) => {
      const batch = drawBatch.current;
      if (!batch) return;
      drawBatch.current = null;
      actions.commitBatch();
      if (offerUndo && batch.adjusted) offerAdjustedUndoRef.current(batch.adjusted);
    },
    [actions],
  );
  useEffect(() => () => closeDrawBatch(false), [closeDrawBatch]);
  const endAsking = () => {
    askingRef.current = null;
    setAsking(null);
  };
  // The dialog only lives on desktop and while its block is on the shown screen. A screen or device change
  // that comes without a press outside (assistive tech, the keyboard elsewhere) closes it and its batch.
  useEffect(
    () =>
      store.subscribe(() => {
        if (askingRef.current === null) return;
        // After the change that triggered this has finished (never a batch commit inside a store update).
        queueMicrotask(() => {
          const state = store.getState();
          const id = askingRef.current;
          if (id === null || askingStillValid(state.device, selectActiveScreen(state)?.layout ?? null, id)) return;
          askingRef.current = null;
          closeDrawBatch(false);
          setAsking(null);
        });
      }),
    [store, closeDrawBatch],
  );

  const createDrawn = (rect: GridRect) => {
    if (!screen) return;
    actions.beginBatch();
    const batch: DrawBatch = { adjusted: null };
    drawBatch.current = batch;
    const outcome = actions.insertBlock("free", { rect });
    if (!outcome.id) {
      closeDrawBatch(false);
      return;
    }
    flashBlocks([outcome.id, ...adjustedIds(outcome.adjustments)]);
    batch.adjusted = report(t.canvas.drawn(blockNow(outcome.id)?.rect ?? rect), outcome.adjustments, false);
    actions.setTool("edit");
    askingRef.current = outcome.id;
    setAsking(outcome.id);
  };

  const chooseType = (type: LibraryBlockType) => {
    const id = asking;
    if (!id) return;
    const outcome = actions.updateBlock(id, { type });
    // A navigation choice turns the box into the app's navigation: its adjustments no longer apply.
    closeDrawBatch(!outcome.nav);
    endAsking();
    if (outcome.nav) {
      announce(t.whatIsThis.frameChosen(t.nav[outcome.nav]));
      requestFocus("scroller");
    } else {
      announce(t.whatIsThis.chosen(t.blocks[type].name));
      requestFocus(id);
    }
  };
  const keepFree = () => {
    const id = asking;
    closeDrawBatch(true);
    endAsking();
    if (id) requestFocus(id);
    announce(t.whatIsThis.keptFree);
  };
  const dismissAsking = () => {
    closeDrawBatch(true);
    endAsking();
  };

  const onLibraryDrop = (type: LibraryBlockType, rect: GridRect | null) => {
    if (!screen || !editable) return;
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
    const token = actions.changeToken();
    const gone = new Set(removed);
    const next = nearestSurvivor(order, id, (other) => !gone.has(other));
    const message = removed.length > 1 ? t.announce.removedMany(removed.length) : t.announce.removed(block.label);
    announce(message);
    toast(message, { action: { label: t.adjusted.undo, onClick: () => undoFromToast(token, id) } });
    requestFocus(next ?? "scroller");
  };

  const applyFixRef = useRef<(fix: LayoutFix, label: string, id: BlockId) => void>(() => {});
  useLayoutEffect(() => {
    applyFixRef.current = (fix, label, id) => {
      if (!actions.applyFix(fix)) return;
      announce(t.announce.fixApplied(label, nameOf(id)));
      requestFocus(id);
    };
  });
  const onApplyFix = useCallback((fix: LayoutFix, label: string, id: BlockId) => applyFixRef.current(fix, label, id), []);

  /* ---- Pointer gestures and library drops ---- */
  const { gesture, anchor, onPointerDown } = usePointerGestures(scrollerRef, gridRef, {
    screenId: screen?.id ?? "",
    tool,
    editable,
    layout,
    readLayout,
    metrics,
    select,
    focusBlock,
    focusScroller,
    commitRect,
    createDrawn,
    beforeGesture: () => {
      if (grabRef.current) dropGrab(grabRef.current);
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
  // The scroller is the droppable: it is clipped to what the user sees (the grid extends under the bars).
  const dropRef = drop.ref;
  const setScroller = useCallback(
    (element: HTMLDivElement | null) => {
      scrollerRef.current = element;
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

  const stacking = useMemo(() => stackingOrder(layout, order), [layout, order]);
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

  // New arrays on every edit; BlockFrame compares them by content, so only blocks whose warnings changed re-render.
  const warningViews = useMemo(() => {
    const out = new Map<BlockId, BlockWarningView[]>();
    if (!structure || !editable || revealing) return out;
    const label = (id: BlockId) => layout.blocks[id]?.label ?? id;
    for (const [id, warnings] of warningsByBlock(structure.warnings)) out.set(id, buildWarningViews(warnings, label, t));
    return out;
  }, [structure, editable, revealing, layout, t]);

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
    const z = stacking.get(id) ?? 1;
    return [{ id, block, rect, box, zIndex: lifted(id) ? Z_ACTIVE + z : z }];
  });
  const selectedItem = editable && tool === "edit" && !grab && !revealing ? items.find((item) => item.id === selectedId) : undefined;

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
  // While the generated page stays, the frame grows to show all of it.
  const [revealHeight, setRevealHeight] = useState(0);
  const frameHeight = Math.max(frameHeightPx(geometry, rows), revealHere ? revealHeight : 0);
  const gridHeight = rows * metrics.rowPx;

  const outlines = useMemo(
    () => (showStructure && editable && !revealing && structure ? regionOutlines(structure.root) : []),
    [showStructure, editable, revealing, structure],
  );
  const numbers: ReadingNumber[] = showStructure && !revealing ? items.map((item, index) => ({ id: item.id, left: item.box.left, top: item.box.top, n: index + 1 })) : [];

  const hiddenHere = derived
    ? (structure?.order ?? []).filter((id) => derived.blocks[id]?.hidden && layout.blocks[id]).map((id) => ({ id, name: layout.blocks[id]!.label }))
    : [];

  const autoFocusId = selectedId && items.some((item) => item.id === selectedId) ? selectedId : (items[0]?.id ?? null);
  const gestureActive = (gesture !== null && gesture.kind !== "pan") || grab !== null || drop.state !== "idle";
  const askingBlock = asking && editable ? layout.blocks[asking] : undefined;

  /* ---- After every render: boxes for the scroll helpers, then pending focus and reveals ---- */
  const lastDevice = useRef(device);
  useLayoutEffect(() => {
    boxesRef.current = new Map(items.map((item) => [item.id, item.box]));
    orderRef.current = order;

    // A device switch: keep the selected block in view, or start at the top (never past the new content).
    if (lastDevice.current !== device) {
      lastDevice.current = device;
      const scroller = scrollerRef.current;
      const gridTop = gridTopInScroller();
      if (scroller && gridTop !== null) {
        const selected = selectSelectedId(store.getState());
        const box = selected ? boxesRef.current.get(selected) : undefined;
        const view = { scrollTop: scroller.scrollTop, height: scroller.clientHeight };
        scroller.scrollTop = scrollAfterDeviceSwitch(view, box ? { top: gridTop + box.top, height: box.height } : null);
      }
    }

    const target = pendingFocus.current;
    if (target) {
      pendingFocus.current = null;
      if (target === "scroller" || !focusBlock(target)) focusScroller();
      else {
        // Focus moved by the canvas (deletion, undo, a fix…): bring the block into view.
        const box = boxesRef.current.get(target);
        if (box) revealBox(box, "nearest", false);
      }
    }
    const reveal = pendingReveal.current;
    if (reveal) {
      pendingReveal.current = null;
      const box = boxesRef.current.get(reveal.id);
      // A keyboard resize follows the bottom edge; a keyboard move, the whole block.
      if (box) revealBox(reveal.edge === "bottom" ? { top: box.top + box.height - metrics.rowPx, height: metrics.rowPx } : box, "nearest", false);
    }
  });

  /* ---- «Generar» moment: the canvas is a preview ---- */
  // Presses never reach the canvas gestures (a press during the animation skips it, in GenerateReveal); only the
  // chips' «Reintentar» stays usable. Scrolling still works.
  useEffect(() => {
    const root = rootRef.current;
    if (!revealing || !root) return;
    const block = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-reveal-interactive]")) return;
      event.stopPropagation();
    };
    root.addEventListener("pointerdown", block, true);
    root.addEventListener("click", block, true);
    return () => {
      root.removeEventListener("pointerdown", block, true);
      root.removeEventListener("click", block, true);
    };
  }, [revealing]);
  // Another screen opened while the moment plays: the moment is over (that screen's page just shows).
  const playingScreen = reveal?.phase === "playing" ? reveal.screenId : null;
  const shownScreen = screen?.id ?? null;
  useEffect(() => {
    if (playingScreen !== null && shownScreen !== null && playingScreen !== shownScreen) endReveal();
  }, [playingScreen, shownScreen, endReveal]);
  const revealLayerRef = useRef<HTMLDivElement | null>(null);
  const revealOrder = items.map((item) => item.id);
  const labelOfSection = useCallback(
    (id: string) => (id === SHELL_ID && shell ? t.canvas.navFrame(t.nav[shell.nav]) : (layout.blocks[id]?.label ?? id)),
    [shell, layout, t],
  );

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
        announce(t.canvas.readOnly(deviceName), "assertive");
      },
      grab: (step) => {
        if (grabRef.current) return;
        select(step.grab.id);
        actions.beginBatch();
        setGrab(step.grab);
        announce(t.canvas.grabbed(nameOf(step.grab.id)));
      },
      nudge: (step) => {
        setGrab(step.grab);
        requestReveal(step.grab.id, step.type === "resize" ? "bottom" : "box");
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
        requestFocus(copy);
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
        if (changeKeepingFocus(history.undo, focusedBlockId())) announce(t.announce.undone);
      },
      redo: () => {
        if (!history.canRedo) return;
        if (changeKeepingFocus(history.redo, focusedBlockId())) announce(t.announce.redone);
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
      onKeyDown={revealing ? undefined : keyboard.onKeyDown}
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
      <div className="relative flex min-h-[24rem] flex-1 flex-col">
        {/* The canvas surface alone shares `canvasLayoutId` with Ajustar's canvas: it grows into it (and back) while
            the steps cross-fade; the blocks and the page are never stretched. Measured only when the screen changes. */}
        <motion.div
          aria-hidden
          layoutId={canvasLayoutId}
          layoutDependency={screen.id}
          transition={smooth}
          className="pointer-events-none absolute inset-0 rounded-panel border border-app bg-app/70"
        />
        <motion.div
          ref={setScroller}
          layoutScroll
          tabIndex={-1}
          {...(items.length === 0 && { [REGION_AUTOFOCUS_ATTR]: "" })}
          onPointerDown={onPointerDown}
          className={cn(
            // `isolate`: the canvas z-indices (blocks, handles, overlays) stay inside it, under the page's bars and popovers.
            // Stable gutter: the scrollbar appearing must not change the measured width (and the frame's). The surface
            // (background, border) is the shared frame behind it; the transparent border keeps the same geometry.
            "relative isolate min-h-[24rem] flex-1 overflow-auto overscroll-contain rounded-panel border border-transparent [scrollbar-gutter:stable]",
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
              <AnimatePresence>
                {revealHere && (
                  <GenerateReveal
                    key={`${revealHere.id}:${screen.id}`}
                    doc={doc}
                    screenId={screen.id}
                    play={revealHere.play}
                    deviceWidth={geometry.deviceWidth}
                    scale={geometry.k}
                    layerRef={revealLayerRef}
                    gridRef={gridRef}
                    skipAreaRef={rootRef}
                    order={revealOrder}
                    onPlayed={endReveal}
                    onHeight={setRevealHeight}
                  />
                )}
              </AnimatePresence>
              <div
                ref={gridRef}
                // `data-tool` drives the blocks' cursors (group `canvas`): a tool change never re-renders them.
                data-tool={tool}
                // During a «Generar» moment the boxes are faded out: out of the Tab order and the pointer's way.
                inert={revealing}
                className={cn(
                  "group/canvas absolute select-none",
                  tool === "draw" && editable && "cursor-crosshair touch-none",
                  revealing && "pointer-events-none",
                )}
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
                      autoFocus={item.id === autoFocusId}
                      chip={roomy ? chip : null}
                      warnings={warningViews.get(item.id)}
                      flashKey={flash.ids.has(item.id) ? flash.key : 0}
                      layoutKey={layoutKeyOf(device, item.rect)}
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
                    badge={(warningViews.get(selectedItem.id)?.length ?? 0) > 0}
                  />
                )}
                <AnimatePresence>
                  {showStructure && !revealing && <StructureOverlay key="structure" outlines={outlines} metrics={metrics} numbers={numbers} />}
                </AnimatePresence>
                {editable && <DrawTool box={drawRect ? blockBox(drawRect, metrics, 1) : null} anchor={anchor} anchorHint={t.canvas.drawStart} />}
                <DropOverlay state={drop.state} ghost={ghost} hint={dropHint} />
                {empty && editable && drop.state === "idle" && !drawRect && <EmptyHint />}
              </div>
              {revealHere && reveal?.phase === "holding" && (
                <RevealChips screenId={screen.id} layerRef={revealLayerRef} doc={doc} labelOf={labelOfSection} />
              )}
            </div>
            {editable && !revealing && (
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
      </div>
      <p id={instructionsId} className="sr-only">
        {t.canvas.instructions(shortcutsEnabled)}
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
