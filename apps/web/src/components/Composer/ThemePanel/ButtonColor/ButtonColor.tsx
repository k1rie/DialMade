"use client";

import type { DesignDoc, PatchOperation, TokenOverrides } from "@dialmade/doc";
import { contrastRatio, type ScaleStep, type Theme } from "@dialmade/palette";
import { motion } from "motion/react";
import { useMemo, useRef, type KeyboardEvent } from "react";
import { useDesignDocActions } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import { BUTTON_COLOR_ROLES, BUTTON_COLOR_STEPS } from "../../constants";
import { CheckIcon } from "../../icons";
import { PanelSection } from "../../PanelSection";

export type ButtonColorProps = {
  doc: DesignDoc;
  theme: Theme;
};

type Swatch = { key: string; hex: string; foreground: string; label: string };

const TEXT_AA = 4.5;
const LIGHT_TEXT = "#ffffff";
const DARK_TEXT = "#0a0a0a";

/** Text color that keeps AA on `hex`, or null when neither white nor near-black does. */
function foregroundFor(hex: string): string | null {
  const white = contrastRatio(hex, LIGHT_TEXT);
  const black = contrastRatio(hex, DARK_TEXT);
  const best = white >= black ? LIGHT_TEXT : DARK_TEXT;
  return Math.max(white, black) >= TEXT_AA ? best : null;
}

const stepOf = (scale: readonly ScaleStep[] | undefined, step: number) => scale?.find((s) => s.step === step);

function withoutButtonRoles(colors: TokenOverrides["color"]["light"]): TokenOverrides["color"]["light"] {
  const next = { ...colors };
  for (const role of BUTTON_COLOR_ROLES) delete next[role];
  return next;
}

/**
 * «Color de botón» (Buffer): swatches from the brand, accent and neutral scales that keep AA text.
 * Picking one overrides `primary`/`cta` (and their text color) in both modes; «Automático» clears it.
 */
export function ButtonColor({ doc, theme }: ButtonColorProps) {
  const t = useDictionary(composer);
  const actions = useDesignDocActions();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const swatches = useMemo(() => {
    const groups: [keyof typeof BUTTON_COLOR_STEPS, readonly ScaleStep[] | undefined][] = [
      ["brand", theme.scales.brand],
      ["cta", theme.scales.accent],
      ["neutral", theme.scales.neutral],
    ];
    const seen = new Set<string>();
    const list: Swatch[] = [];
    for (const [scale, steps] of groups) {
      for (const step of BUTTON_COLOR_STEPS[scale]) {
        const found = stepOf(steps, step);
        const foreground = found && foregroundFor(found.hex);
        if (!found || !foreground || seen.has(found.hex)) continue;
        seen.add(found.hex);
        list.push({ key: `${scale}-${step}`, hex: found.hex, foreground, label: t.buttonColor.swatch(t.buttonColor.scales[scale], step, found.hex.toUpperCase()) });
      }
    }
    return list;
  }, [theme, t]);

  const current = doc.tokens.color.light.primary?.toLowerCase();
  const selectedIndex = current ? swatches.findIndex((s) => s.hex.toLowerCase() === current) : -1;
  const options = [{ key: "auto", hex: theme.light.primary, foreground: theme.light.primaryForeground, label: t.buttonColor.auto }, ...swatches];
  const checkedIndex = current ? selectedIndex + 1 : 0;

  const pick = (index: number) => {
    const option = options[index];
    if (!option) return;
    const { light, dark } = doc.tokens.color;
    const ops: PatchOperation[] =
      index === 0
        ? [
            { op: "replace", path: "/tokens/color/light", value: withoutButtonRoles(light) },
            { op: "replace", path: "/tokens/color/dark", value: withoutButtonRoles(dark) },
          ]
        : (["light", "dark"] as const).map((mode) => ({
            op: "replace" as const,
            path: `/tokens/color/${mode}`,
            value: {
              ...doc.tokens.color[mode],
              primary: option.hex,
              "primary-foreground": option.foreground,
              cta: option.hex,
              "cta-foreground": option.foreground,
            },
          }));
    actions.applyPatch(ops);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (checkedIndex + delta + options.length) % options.length;
    pick(next);
    refs.current[next]?.focus();
  };

  return (
    <PanelSection title={t.buttonColor.title}>
      <div role="radiogroup" aria-label={t.buttonColor.label} onKeyDown={onKeyDown} className="flex flex-wrap gap-2">
        {options.map((option, index) => {
          const checked = index === checkedIndex;
          return (
            <motion.button
              key={option.key}
              ref={(element) => {
                refs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={option.label}
              title={option.label}
              tabIndex={checked ? 0 : -1}
              onClick={() => pick(index)}
              whileTap={{ scale: 0.9 }}
              transition={snappy}
              className={cn(
                "relative grid size-7 place-items-center rounded-full",
                checked ? "shadow-[0_0_0_2px_var(--app-bg),0_0_0_3.5px_var(--app-accent)]" : "shadow-[inset_0_0_0_1px_oklch(1_0_0/0.14)]",
              )}
              style={{ background: option.hex, color: option.foreground }}
            >
              {index === 0 && <span aria-hidden className="text-[0.625rem] font-semibold">A</span>}
              {checked && index !== 0 && <CheckIcon aria-hidden strokeWidth={2.4} className="size-3.5" />}
            </motion.button>
          );
        })}
      </div>
    </PanelSection>
  );
}
