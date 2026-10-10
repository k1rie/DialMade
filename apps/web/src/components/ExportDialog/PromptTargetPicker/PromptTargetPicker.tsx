"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import { AI_TARGETS, type AiTargetId } from "../constants";

export type PromptTargetPickerProps = {
  value: AiTargetId;
  onChange: (target: AiTargetId) => void;
  label: string;
};

/** Segmented radio group (native radios: arrows move, Tab leaves). */
export function PromptTargetPicker({ value, onChange, label }: PromptTargetPickerProps) {
  const name = useId();
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">{label}</legend>
      <div className="inline-flex rounded-control border border-app bg-app p-0.5">
        {AI_TARGETS.map((target) => {
          const checked = value === target.id;
          return (
            <label key={target.id} className="relative cursor-pointer">
              <input
                type="radio"
                name={name}
                value={target.id}
                checked={checked}
                onChange={() => onChange(target.id)}
                className="peer sr-only"
              />
              {checked && (
                <motion.span
                  layoutId={`${name}-thumb`}
                  transition={snappy}
                  aria-hidden
                  className="absolute inset-0 rounded-[8px] border border-app-strong bg-surface-hover"
                />
              )}
              <span
                className={cn(
                  "relative block rounded-[8px] px-2.5 py-1 text-small font-medium transition-colors duration-150",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-accent",
                  checked ? "text-fg" : "text-muted hover:text-fg",
                )}
              >
                {target.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
