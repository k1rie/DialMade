"use client";

import type { DesignDoc } from "@dialmade/doc";
import type { BlockId, ScreenId } from "@dialmade/layout";
import { PageRenderer } from "@dialmade/sections";
import { animate, motion, useIsPresent, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useStore } from "zustand";
import { ThemeScope } from "@/components/ThemeScope";
import { createDesignDocStore, useOptionalDesignDocStore } from "@/hooks/useDesignDoc";
import { ease, tween } from "@/lib/motion";
import { compileScreenLayout, linkedScreen, scopedScreenCss, screenLinks } from "@/lib/screen-layout";
import { FULL_INSET, REVEAL_TIMING, insetFrom, planReveal, rectIn } from "./revealPlan";

/** Attribute of a canvas box's outer element (BlockFrame): what the moment fades. */
export const BLOCK_BOX_ATTR = "data-block-box";

export type GenerateRevealProps = {
  doc: DesignDoc;
  screenId: ScreenId;
  /** Play the signature moment on mount; otherwise (a screen opened while the page stays) just show the page. */
  play: boolean;
  /** Device width of the frame (the page renders at it, so its container queries see the real width) and screen px per page px. */
  deviceWidth: number;
  scale: number;
  /**
   * Points to the current layer (RevealChips measures the sections through it). A layer leaving (its fade-out)
   * never clears it once a newer layer took it.
   */
  layerRef: RefObject<HTMLDivElement | null>;
  /** The canvas grid: its boxes carry `data-block-box`. */
  gridRef: RefObject<HTMLElement | null>;
  /** Where a press skips the moment (the whole canvas). */
  skipAreaRef: RefObject<HTMLElement | null>;
  /** Block ids in reading order (the canvas's order), read on mount. */
  order: readonly BlockId[];
  /** The moment is over: played to the end or skipped. Only called when `play`. */
  onPlayed: () => void;
  /** Height of the page on screen (px), so the frame can grow to show all of it. */
  onHeight: (height: number) => void;
};

/**
 * Fades the faded boxes back in, once (the layer is leaving: back to editing, or another screen). The inline
 * opacity goes only if nothing faded the box again meanwhile (a newer layer).
 */
function restoreBoxes(boxes: HTMLElement[]) {
  for (const box of boxes.splice(0)) {
    const done = () => {
      if (box.style.opacity === "1") box.style.removeProperty("opacity");
    };
    animate(box, { opacity: 1 }, { duration: REVEAL_TIMING.boxMs / 1000, ease }).finished.then(done, done);
  }
}

// Outside a DesignDocProvider (the standalone step) there is no runtime logo.
const detachedStore = createDesignDocStore();
const SECTIONS_SELECTOR = (id: string) => `[data-dl-id="${CSS.escape(id)}"]`;
const BOX_SELECTOR = (id: string) => `[${BLOCK_BOX_ATTR}="${CSS.escape(id)}"]`;

/**
 * The «Generar» signature moment inside the canvas (critique #8): the generated screen, painted by PageRenderer
 * inside a ThemeScope with that screen's dials and its layout CSS scoped to this layer (`scopedScreenCss`), in a
 * layer under the boxes at the canvas geometry (rendered at the device width and scaled to the frame). The page
 * fades in, then in reading order each box fades and its section opens with `clip-path: inset()` from the box's
 * rect to its own `[data-dl-id]` rect (`planReveal`: 30–40 ms stagger, ≤900 ms). A press on the canvas or Esc
 * completes it at once; reduced motion is a 150 ms fade. Nothing animates the layout itself.
 *
 * Decorative (`aria-hidden`, inert): the step announces the result and the bar carries the actions. When the
 * layer goes (back to editing), the boxes fade back in.
 */
export function GenerateReveal({ doc, screenId, play, deviceWidth, scale, layerRef, gridRef, skipAreaRef, order, onPlayed, onHeight }: GenerateRevealProps) {
  const reduced = useReducedMotion() ?? false;
  const designStore = useOptionalDesignDocStore() ?? detachedStore;
  const logoUrl = useStore(designStore, (state) => state.logoUrl);
  const mode = useStore(designStore, (state) => state.previewMode);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const ownRef = useRef<HTMLDivElement | null>(null);
  // The boxes this layer faded: they come back as soon as it starts leaving, not after its fade-out.
  const boxesRef = useRef<HTMLElement[]>([]);
  const present = useIsPresent();
  useEffect(() => {
    if (!present) restoreBoxes(boxesRef.current);
  }, [present]);
  const setLayer = useCallback(
    (element: HTMLDivElement | null) => {
      if (element) layerRef.current = element;
      else if (layerRef.current === ownRef.current) layerRef.current = null;
      ownRef.current = element;
    },
    [layerRef],
  );

  const screen = Object.hasOwn(doc.screens, screenId) ? doc.screens[screenId]! : null;
  const compiled = useMemo(() => (screen ? compileScreenLayout(screen) : null), [screen]);
  const layoutCss = useMemo(() => (screen ? scopedScreenCss(screen) : undefined), [screen]);
  const links = useMemo(() => (screen && compiled ? screenLinks(doc, screen, compiled.absorbed) : undefined), [doc, screen, compiled]);
  // The layer is inert: links only mark which elements lead to a screen, like the Composer's edit mode.
  const linkHref = useCallback((id: string) => (linkedScreen(doc, id) ? "#" : null), [doc]);

  // Read on mount only: the moment plays once per layer (the parent keys it by moment and screen).
  const mount = useRef({ play, order, reduced, scale, onPlayed, hasPage: screen !== null });
  useLayoutEffect(() => {
    mount.current.onPlayed = onPlayed;
  });

  useLayoutEffect(() => {
    const { play: playing, order: ids, reduced: still, scale: k, hasPage } = mount.current;
    const layer = ownRef.current;
    const grid = gridRef.current;
    const boxes = boxesRef.current;
    const sections: HTMLElement[] = [];
    const controls: AnimationPlaybackControls[] = [];
    let ended = false;
    let safety = 0;

    const releaseSections = () => {
      for (const section of sections) {
        section.style.removeProperty("clip-path");
        section.style.removeProperty("opacity");
      }
      sections.length = 0;
    };
    const area = skipAreaRef.current;
    const onPress = () => skip();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      skip();
    };
    const detach = () => {
      area?.removeEventListener("pointerdown", onPress, true);
      window.removeEventListener("keydown", onKey, true);
    };
    const end = () => {
      if (ended) return;
      ended = true;
      window.clearTimeout(safety);
      detach();
      releaseSections();
      if (playing) mount.current.onPlayed();
    };
    function skip() {
      if (ended) return;
      for (const control of controls) control.complete();
      end();
    }

    if (!layer || !grid || !hasPage) {
      end();
      return detach;
    }

    if (!playing) {
      // A screen opened while the page stays: its boxes simply give way to the page.
      for (const id of ids) {
        const box = grid.querySelector<HTMLElement>(BOX_SELECTOR(id));
        if (!box) continue;
        boxes.push(box);
        controls.push(animate(box, { opacity: 0 }, { duration: REVEAL_TIMING.reducedMs / 1000, ease: "linear" }));
      }
      ended = true;
    } else {
      const plan = planReveal(ids, { reduced: still });
      const origin = layer.getBoundingClientRect();
      for (const step of plan.steps) {
        const box = grid.querySelector<HTMLElement>(BOX_SELECTOR(step.id));
        const section = layer.querySelector<HTMLElement>(SECTIONS_SELECTOR(step.id));
        const delay = step.delayMs / 1000;
        if (box) {
          boxes.push(box);
          controls.push(
            animate(box, { opacity: 0 }, plan.reduced ? { duration: plan.itemMs / 1000, ease: "linear" } : { delay, duration: REVEAL_TIMING.boxMs / 1000, ease }),
          );
        }
        // A block with no section (hidden, absorbed into its parent) only fades its box. Reduced motion: the
        // layer's own fade shows every section at once.
        if (!section || plan.reduced) continue;
        const from = box ? insetFrom(rectIn(box.getBoundingClientRect(), origin), rectIn(section.getBoundingClientRect(), origin), k) : FULL_INSET;
        section.style.opacity = "0";
        section.style.clipPath = from;
        sections.push(section);
        controls.push(animate(section, { opacity: [0, 1] }, { delay, duration: REVEAL_TIMING.sectionMs / 1000, ease: "linear" }));
        controls.push(animate(section, { clipPath: [from, FULL_INSET] }, { delay, duration: plan.itemMs / 1000, ease }));
      }
      area?.addEventListener("pointerdown", onPress, true);
      window.addEventListener("keydown", onKey, true);
      // Natural end; the timer is a safety net should a promise never settle (a stopped animation).
      void Promise.all(controls.map((control) => control.finished)).then(end, end);
      safety = window.setTimeout(end, plan.totalMs + 300);
    }

    return () => {
      // A stopped moment never reports its end (a newer one, or no canvas, takes over).
      ended = true;
      window.clearTimeout(safety);
      detach();
      for (const control of controls) control.stop();
      releaseSections();
      // Harmless when the whole canvas is leaving.
      restoreBoxes(boxes);
    };
  }, [gridRef, skipAreaRef]);

  // The page's height on screen, so the frame shows all of it while it stays.
  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const report = () => onHeight(page.offsetHeight * scale);
    report();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(report);
    observer.observe(page);
    return () => observer.disconnect();
  }, [onHeight, scale]);

  if (!screen) return null;

  return (
    <motion.div
      ref={setLayer}
      aria-hidden
      inert
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-b-[12px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: (reduced ? REVEAL_TIMING.reducedMs : REVEAL_TIMING.baseMs) / 1000, ease: "linear" } }}
      exit={{ opacity: 0, transition: tween(0.2) }}
    >
      <div ref={pageRef} className="origin-top-left" style={{ width: deviceWidth, transform: `scale(${scale})` }}>
        {/* No color interpolation: the layer is new, nothing to interpolate from. */}
        <ThemeScope doc={doc} kind={screenId} screen={screenId} mode={mode} transition={false}>
          <PageRenderer
            doc={doc}
            kind={screen.kind}
            page={screen.page}
            mode={mode}
            {...(logoUrl && { logoUrl })}
            {...(layoutCss !== undefined && { layoutCss, linkHref, ...(links && { links }) })}
          />
        </ThemeScope>
      </div>
    </motion.div>
  );
}
