"use client";

import type { BlockId } from "@dialmade/layout";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { tween } from "@/lib/motion";
import { EyeOffIcon } from "../../icons";

export type DerivedBannerProps = {
  /** Id of the explanation, referenced by the blocks' `aria-describedby` on this view. */
  descriptionId: string;
  /** «Tablet» / «Móvil». */
  deviceName: string;
  /** Blocks hidden on this device, in reading order. */
  hidden: readonly { id: BlockId; name: string }[];
  onEditDesktop: () => void;
  onSelect: (id: BlockId) => void;
};

/**
 * Above a derived view (tablet / mobile): what it is, «Editar en escritorio», and the blocks hidden on
 * this device as chips that select them (the inspector is where they are shown again).
 */
export function DerivedBanner({ descriptionId, deviceName, hidden, onEditDesktop, onSelect }: DerivedBannerProps) {
  const t = useDictionary(layout);
  return (
    <motion.div
      data-canvas-ignore=""
      className="flex flex-none flex-col gap-2 rounded-card border border-app bg-app-elevated/80 px-3 py-2"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={tween(0.2)}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <p className="min-w-0 flex-1 text-caption text-muted">
          <span className="font-semibold text-fg">{t.canvas.derivedTitle}</span> · <span id={descriptionId}>{t.canvas.derived}</span>
        </p>
        <Button size="sm" onClick={onEditDesktop}>
          {t.canvas.editDesktop}
        </Button>
      </div>
      {hidden.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-caption text-muted [&_svg]:size-3.5">
            <EyeOffIcon />
            {t.canvas.hiddenIn(deviceName, hidden.length)}
          </span>
          {hidden.map((item) => (
            <Chip key={item.id} size="sm" aria-label={t.canvas.selectBlock(item.name)} onClick={() => onSelect(item.id)}>
              {item.name}
            </Chip>
          ))}
        </div>
      )}
    </motion.div>
  );
}
