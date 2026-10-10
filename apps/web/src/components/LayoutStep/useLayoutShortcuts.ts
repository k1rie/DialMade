"use client";

import { useCallback, useEffect, useRef, type FocusEvent, type RefObject } from "react";
import { REGION_ATTR, REGION_AUTOFOCUS_ATTR, regionSelector } from "./constants";
import type { LayoutRegion, LeftTab } from "./types";
import type { LayoutStore } from "./useLayoutStore";

/** Tab of the left panel that shows each of its two areas. */
export const TAB_REGION: Readonly<Record<LeftTab, LayoutRegion>> = { blocks: "library", layers: "layers" };

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

const isVisible = (element: HTMLElement) => element.getClientRects().length > 0;

/**
 * Focuses an F6 area: where focus last was inside it, else its visible `data-region-autofocus` element,
 * else its first tabbable element, else the area itself (it has tabIndex -1). Hidden elements (the
 * inactive tab panel of the left area) are skipped.
 */
function focusInto(region: HTMLElement, remembered: ReadonlyMap<string, HTMLElement>): boolean {
  const name = region.getAttribute(REGION_ATTR) ?? "";
  const last = remembered.get(name);
  const target =
    (last && last.isConnected && region.contains(last) && isVisible(last) ? last : null) ??
    Array.from(region.querySelectorAll<HTMLElement>(`[${REGION_AUTOFOCUS_ATTR}]`)).find(isVisible) ??
    Array.from(region.querySelectorAll<HTMLElement>(TABBABLE)).find((element) => element.tabIndex >= 0 && isVisible(element)) ??
    region;
  target.focus();
  return document.activeElement === target;
}

/** Frames `focusRegion` keeps trying while the area is still mounting (a tab switch, the first screen). */
const FOCUS_ATTEMPTS = 3;

/**
 * Keyboard of the whole step: the F6 / Shift+F6 cycle between its areas (Pantallas · Bloques/Capas ·
 * Lienzo · Inspector), and `focusRegion` for the controls that send focus to an area («Estilo»,
 * «Añadir bloque», the template picker). Only F6 is global here, and only from inside the step (or
 * from nothing focused), never inside a dialog. Every other shortcut is scoped to the DOM of the area
 * that owns it, so none of them fire twice: the canvas (`LayoutCanvas/useCanvasKeyboard`: Space/Enter
 * grab and drop, arrows, Supr, F2, R/V/H, ⌘D, ⌘Z/⇧⌘Z, Esc) and the layers tree (`LayersList`: the
 * tree keys, Supr, F2, ⌘D, ⌘Z/⇧⌘Z, Esc).
 */
export function useLayoutShortcuts(rootRef: RefObject<HTMLElement | null>, store: LayoutStore) {
  /** The element that last had focus inside each area (F6 comes back to it). */
  const remembered = useRef(new Map<string, HTMLElement>());

  /** `onFocus` of the step's root (focus events bubble in React). */
  const rememberFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    const target = event.target;
    const region = target.closest<HTMLElement>(`[${REGION_ATTR}]`);
    const name = region?.getAttribute(REGION_ATTR);
    if (name && target !== region) remembered.current.set(name, target);
  }, []);

  const focusRegion = useCallback(
    (region: LayoutRegion) => {
      const focus = (attempt: number) => {
        const element = rootRef.current?.querySelector<HTMLElement>(regionSelector(region));
        if (element && focusInto(element, remembered.current)) return;
        if (attempt + 1 < FOCUS_ATTEMPTS) requestAnimationFrame(() => focus(attempt + 1));
      };
      const tab = (Object.keys(TAB_REGION) as LeftTab[]).find((key) => TAB_REGION[key] === region);
      if (tab && store.getState().leftTab !== tab) {
        store.getState().actions.setLeftTab(tab);
        requestAnimationFrame(() => focus(0)); // after the area shows that tab
        return;
      }
      focus(0);
    },
    [rootRef, store],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F6" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const root = rootRef.current;
      if (!root) return;
      const active = document.activeElement;
      // Only from inside the step (or from nothing); a dialog keeps its own focus trap.
      if (active && active !== document.body && !root.contains(active)) return;
      if (active?.closest('[role="dialog"], [aria-modal="true"]')) return;
      const regions = Array.from(root.querySelectorAll<HTMLElement>(`[${REGION_ATTR}]`)).filter(isVisible);
      if (regions.length === 0) return;
      event.preventDefault();
      const current = active?.closest<HTMLElement>(`[${REGION_ATTR}]`) ?? null;
      const index = current ? regions.indexOf(current) : -1;
      const step = event.shiftKey ? -1 : 1;
      const next = index < 0 ? (step > 0 ? 0 : regions.length - 1) : (index + step + regions.length) % regions.length;
      focusInto(regions[next]!, remembered.current);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [rootRef]);

  return { focusRegion, rememberFocus };
}
