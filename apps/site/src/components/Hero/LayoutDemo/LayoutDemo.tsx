"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { DemoStrings } from "@/i18n";
import { format } from "@/i18n/format";
import { blockIds, blocks, starterLayout, type BlockId } from "@/lib/blocks";
import { demoBrands, type DemoBrand } from "@/lib/brands";
import { cn } from "@/lib/cn";
import { ease, reducedFade } from "@/lib/motion";
import { BlockLibrary } from "./BlockLibrary";
import { CanvasBlock } from "./CanvasBlock";
import { DemoToolbar } from "./DemoToolbar";
import { DeviceToggle, type Device } from "./DeviceToggle";

const MAX_BLOCKS = 8;
type Item = { key: string; id: BlockId };

const starterItems = (): Item[] => starterLayout.map((id, i) => ({ key: `s${i}`, id }));
/** The «Tú» cursor starts on the calendar, as if the user had just placed it. */
const starterCursor = `s${starterLayout.indexOf("calendar")}`;

export type LayoutDemoProps = {
  /** Strings come from the server section, so the dictionaries stay out of the client bundle. */
  t: DemoStrings;
  blockNames: Record<BlockId, string>;
};

/** Interactive mini Modo Layout: add named blocks, switch device and brand, and generate. */
export function LayoutDemo({ t, blockNames }: LayoutDemoProps) {
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState<Item[]>(starterItems);
  const [generated, setGenerated] = useState(false);
  const [sweep, setSweep] = useState(0);
  const [device, setDevice] = useState<Device>("desktop");
  const [brandId, setBrandId] = useState<DemoBrand["id"]>("coral");
  const [cursorKey, setCursorKey] = useState<string | null>(starterCursor);
  // A new id per message: the keyed node below is replaced, so a repeated text is announced again.
  const [announcement, setAnnouncement] = useState({ id: 0, text: "" });
  const nextKey = useRef(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const firstLibraryButton = useRef<HTMLButtonElement>(null);
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const scrollToEnd = useRef(false);

  const brand = demoBrands.find((b) => b.id === brandId) ?? demoBrands[0]!;
  const compact = device === "mobile";
  const full = items.length >= MAX_BLOCKS;
  const fullText = format(t.full, { max: MAX_BLOCKS });

  const announce = useCallback((text: string) => setAnnouncement((a) => ({ id: a.id + 1, text })), []);

  useEffect(() => {
    if (!scrollToEnd.current) return;
    scrollToEnd.current = false;
    const frame = frameRef.current;
    frame?.scrollTo({ top: frame.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
  }, [items, reduceMotion]);

  const add = useCallback(
    (id: BlockId) => {
      // Library buttons stay focusable at the limit (aria-disabled), so say why nothing happened.
      if (items.length >= MAX_BLOCKS) {
        announce(fullText);
        return;
      }
      const key = `b${nextKey.current++}`;
      scrollToEnd.current = true;
      setItems((prev) => [...prev, { key, id }]);
      setCursorKey(key);
      announce(format(t.live.added, { block: blockNames[id] }));
    },
    [items.length, t, blockNames, fullText, announce],
  );

  const remove = (key: string) => {
    const index = items.findIndex((item) => item.key === key);
    const item = items[index];
    if (!item) return;
    const rest = items.filter((it) => it.key !== key);
    setItems(rest);
    // An empty canvas has nothing to show as a design: back to the layout, so the next block starts as a wireframe.
    if (rest.length === 0) setGenerated(false);
    if (cursorKey === key) setCursorKey(rest[Math.max(0, index - 1)]?.key ?? null);
    announce(format(t.live.removed, { block: blockNames[item.id] }));
    // Keep focus in the canvas: the next block's remove button, else the library.
    const next = rest[index] ?? rest[index - 1];
    requestAnimationFrame(() => {
      (next ? removeButtons.current.get(next.key) : firstLibraryButton.current)?.focus();
    });
  };

  const toggleGenerate = () => {
    const next = !generated;
    setGenerated(next);
    if (next) setSweep((n) => n + 1);
    announce(next ? format(t.live.generated, { brand: brand.name }) : t.live.layout);
  };

  const reset = () => {
    setItems(starterItems());
    setGenerated(false);
    setDevice("desktop");
    setBrandId("coral");
    setCursorKey(starterCursor);
    announce(t.live.reset);
  };

  // Letter shortcuts from the library (N, E, C…), only while focus is inside the demo (WCAG 2.1.4).
  // Space and Enter keep their native meaning.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.key.length !== 1) return;
    const id = blockIds.find((b) => blocks[b].key === e.key.toUpperCase());
    if (!id) return;
    e.preventDefault();
    add(id);
  };

  return (
    <div
      role="region"
      aria-label={t.canvasLabel}
      onKeyDown={onKeyDown}
      className="overflow-hidden rounded-panel border border-app-strong bg-app-elevated/85 shadow-lift"
    >
      <div className="flex h-11 items-center gap-3 border-b border-app px-3">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
        </span>
        {/* Window chrome, like the dots: the region already carries the name. */}
        <span aria-hidden className="font-mono text-caption text-subtle">
          {t.windowTitle}
        </span>
        <div className="ml-auto">
          <DeviceToggle t={t} value={device} onChange={setDevice} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row">
        <BlockLibrary t={t} blockNames={blockNames} full={full} fullText={fullText} onAdd={add} firstButtonRef={firstLibraryButton} />

        <div className="relative min-w-0 flex-1 dot-grid">
          <div ref={frameRef} className="h-[460px] overflow-y-auto scrollbar-none px-4 pt-6 pb-24 sm:h-[480px] sm:px-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={device}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1, transition: reduceMotion ? reducedFade : { duration: 0.22, ease } }}
                exit={{ opacity: 0, scale: 0.98, transition: reduceMotion ? reducedFade : { duration: 0.12, ease } }}
                style={brand.channels as CSSProperties}
                className={cn(
                  "relative mx-auto rounded-card border border-app bg-app/70 p-2 brand-transition",
                  compact ? "w-[232px]" : "w-full max-w-[560px]",
                )}
              >
                {items.length === 0 ? (
                  <p className="grid h-40 place-items-center rounded-[8px] border border-dashed border-white/15 px-6 text-center text-small text-muted">
                    {t.empty}
                  </p>
                ) : (
                  <ol aria-label={t.pageLabel} className="flex flex-col gap-1.5">
                    <AnimatePresence initial={false}>
                      {items.map((item, index) => (
                        <CanvasBlock
                          key={item.key}
                          id={item.id}
                          index={index}
                          label={blockNames[item.id]}
                          generated={generated}
                          compact={compact}
                          brand={brand}
                          withCursor={item.key === cursorKey}
                          cursorLabel={t.cursor}
                          removeLabel={format(t.remove, { block: blockNames[item.id] })}
                          onRemove={() => remove(item.key)}
                          removeRef={(el) => {
                            if (el) removeButtons.current.set(item.key, el);
                            else removeButtons.current.delete(item.key);
                          }}
                        />
                      ))}
                    </AnimatePresence>
                  </ol>
                )}
                {/* Own AnimatePresence: the outer one's initial={false} would otherwise mount the sweep at its end state.
                    The sweep is the skippable signature moment, so reduced motion skips it. */}
                <AnimatePresence>
                  {sweep > 0 && generated && !reduceMotion ? (
                    <motion.span
                      key={sweep}
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden rounded-card"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: 0.62 }}
                    >
                      <motion.span
                        className="absolute inset-x-0 top-0 h-full"
                        style={{ background: "linear-gradient(to bottom, transparent 70%, oklch(1 0 0 / 0.08) 96%, oklch(1 0 0 / 0.5) 100%)" }}
                        initial={{ y: "-100%" }}
                        animate={{ y: "0%" }}
                        transition={{ duration: 0.62, ease }}
                      />
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
            <div className="pointer-events-auto">
              <DemoToolbar
                t={t}
                brandId={brandId}
                generated={generated}
                canGenerate={items.length > 0}
                onBrand={setBrandId}
                onToggleGenerate={toggleGenerate}
                onReset={reset}
              />
            </div>
          </div>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        <span key={announcement.id}>{announcement.text}</span>
      </p>
    </div>
  );
}
