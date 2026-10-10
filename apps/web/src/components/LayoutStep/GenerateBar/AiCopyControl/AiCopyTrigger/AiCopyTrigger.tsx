"use client";

import { Button } from "@/components/ui/Button";
import type { PopoverTriggerProps } from "@/components/ui/Popover";
import { Tooltip } from "@/components/ui/Tooltip";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { cn } from "@/lib/cn";
import type { AiGenerateMode } from "@/lib/ai/render/generation";
import { SparkleIcon } from "../../../icons";

export type AiCopyTriggerProps = PopoverTriggerProps & {
  /** What the AI does in the next «Generar»: nothing, the copy, or the design. */
  mode: AiGenerateMode;
  /** Its popover is open (covers the tooltip's spot). */
  open: boolean;
  onIntent?: (() => void) | undefined;
  className?: string | undefined;
};

/**
 * The «IA» control next to «Generar». Below the bar's @3xl it is a sparkle alone, like Generar's own icon, so a
 * tooltip says what it is and what it does, in the same words as its name (screen readers drop a description equal
 * to the name instead of reading it twice). No tooltip while its popover is open.
 */
export function AiCopyTrigger({ mode, open, onIntent, className, ...props }: AiCopyTriggerProps) {
  const t = useDictionary(aiText).aiRender;
  const on = mode !== "off";
  return (
    // The tooltip is the button's own text: «IA» + «, diseño con IA».
    <Tooltip content={`${t.control}, ${t.controlState(mode)}`} disabled={open}>
      <Button
        {...props}
        size="md"
        variant={on ? "secondary" : "ghost"}
        leadingIcon={<SparkleIcon className={on ? "text-accent" : undefined} />}
        // Out of the label's box: a dot in the button's corner while the AI is on.
        trailingIcon={on ? <span aria-hidden className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" /> : undefined}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        className={cn("px-3", className)}
      >
        {/* The name keeps the visible word («IA») and says what it does. */}
        <span className="sr-only @3xl:not-sr-only">{t.control}</span>
        <span className="sr-only">{`, ${t.controlState(mode)}`}</span>
      </Button>
    </Tooltip>
  );
}
