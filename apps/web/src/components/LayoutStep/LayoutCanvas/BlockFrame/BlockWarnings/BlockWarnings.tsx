"use client";

import type { LayoutFix } from "@dialmade/layout";
import { motion, type Transition } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { WarningIcon } from "../../../icons";
import { Z_BADGE } from "../../constants";

/** A warning of the block, ready to show: its message and its one-click fixes. */
export type BlockWarningView = {
  key: string;
  message: string;
  fixes: readonly { key: string; label: string; fix: LayoutFix }[];
};

/** The 24 px badge overlaps the block's top-right corner: 14 px inside, 10 px outside, 10 px above. */
const BADGE_OFFSET = { left: -14, top: -10 } as const;

export type BlockWarningsProps = {
  /** Block name, for the badge's accessible name. */
  name: string;
  warnings: readonly BlockWarningView[];
  /** The block's top-right corner in screen px, relative to the grid: the badge sits on it. */
  corner: { left: number; top: number };
  /** The block's layout key and spring: the badge follows the block's FLIP. */
  layoutKey: string;
  layoutTransition: Transition;
  onApplyFix: (fix: LayoutFix, label: string) => void;
};

/**
 * Amber badge on a block with warnings (overlaps, implicit containment…). It opens a popover with
 * each warning and its fixes («Anidar», «Poner debajo»…), applied with `actions.applyFix`. A sibling of
 * the block element, never inside it (no nested interactive elements), and outside the block's stacking
 * context (`Z_BADGE`): neither a later block nor the selected block's resize handles cover it.
 */
export function BlockWarnings({ name, warnings, corner, layoutKey, layoutTransition, onApplyFix }: BlockWarningsProps) {
  const t = useDictionary(layout);
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      layout="position"
      layoutDependency={layoutKey}
      transition={{ layout: layoutTransition }}
      data-canvas-ignore=""
      className="absolute size-6"
      style={{ left: corner.left + BADGE_OFFSET.left, top: corner.top + BADGE_OFFSET.top, zIndex: Z_BADGE }}
    >
      <Popover
        open={open}
        onOpenChange={setOpen}
        label={t.canvas.warnings}
        align="end"
        trigger={(props) => (
          <button
            type="button"
            {...props}
            aria-label={t.canvas.warningsLabel(name, warnings.length)}
            className="inline-flex size-6 items-center justify-center rounded-full border border-warning/50 bg-app-elevated text-warning shadow-surface transition-colors hover:bg-surface-hover [&_svg]:size-3.5"
          >
            <WarningIcon />
          </button>
        )}
      >
        <h3 className="mb-2 text-caption font-semibold text-fg">{t.canvas.warnings}</h3>
        <ul className="flex flex-col gap-3">
          {warnings.map((warning) => (
            <li key={warning.key} className="flex flex-col gap-2">
              <p className="text-small text-muted">{warning.message}</p>
              {warning.fixes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {warning.fixes.map((item) => (
                    <Button
                      key={item.key}
                      size="sm"
                      onClick={() => {
                        setOpen(false);
                        onApplyFix(item.fix, item.label);
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Popover>
    </motion.div>
  );
}
