import { motion, useReducedMotion } from "motion/react";
import { BlockPreview } from "@/components/BlockPreview";
import { NamedCursor } from "@/components/NamedCursor";
import type { BlockId } from "@/lib/blocks";
import { blocks } from "@/lib/blocks";
import type { DemoBrand } from "@/lib/brands";
import { ease, reducedFade, smooth, snappy } from "@/lib/motion";
import { CloseIcon } from "../icons";

export type CanvasBlockProps = {
  id: BlockId;
  index: number;
  label: string;
  generated: boolean;
  compact: boolean;
  brand: DemoBrand;
  withCursor: boolean;
  cursorLabel: string;
  removeLabel: string;
  onRemove: () => void;
  removeRef: (el: HTMLButtonElement | null) => void;
};

/** One named rectangle on the demo page. Generating crossfades it into its design, staggered by index. */
export function CanvasBlock(props: CanvasBlockProps) {
  const { id, index, label, generated, compact, brand, withCursor, cursorLabel, removeLabel, onRemove, removeRef } = props;
  const spec = blocks[id];
  // MotionConfig drops transforms under reduced motion; opacity and blur become a 150 ms fade here, with no stagger.
  // The animated keys stay the same either way, so the server markup matches the first client render.
  const reduce = useReducedMotion();
  // Stagger only on the way in: 50 ms × index + 320 ms stays under the 900 ms signature budget.
  const stagger = generated ? Math.min(index, 8) * 0.05 : 0;
  const layer = reduce ? reducedFade : { duration: 0.32, ease, delay: stagger };
  const wireLayer = reduce ? reducedFade : { duration: 0.32, ease, delay: generated ? stagger : 0.08 };
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: reduce ? reducedFade : { duration: 0.16, ease } }}
      transition={reduce ? reducedFade : snappy}
      className="group relative"
      style={{ height: compact ? spec.height.mobile : spec.height.desktop }}
    >
      <span className="sr-only">{label}</span>
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: generated ? 0 : 1 }}
        transition={wireLayer}
      >
        <BlockPreview id={id} mode="wire" label={label} size={spec.size} compact={compact} />
      </motion.div>
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: generated ? 1 : 0, scale: generated ? 1 : 0.985, filter: generated ? "blur(0px)" : "blur(3px)" }}
        transition={layer}
      >
        <BlockPreview id={id} mode="design" label={label} compact={compact} brand={brand} />
      </motion.div>
      <button
        ref={removeRef}
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute -top-2 -right-2 z-10 grid size-5 place-items-center rounded-full border border-app-strong bg-app-elevated text-muted opacity-0 shadow-surface transition-opacity duration-150 group-hover:opacity-100 hover:text-fg focus-visible:opacity-100"
      >
        <CloseIcon className="size-2.5" />
      </button>
      {withCursor ? (
        <motion.div layoutId="demo-cursor" transition={smooth} className="absolute -right-3 -bottom-3 z-20">
          <NamedCursor label={cursorLabel} />
        </motion.div>
      ) : null}
    </motion.li>
  );
}
