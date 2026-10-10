import type { CSSProperties } from "react";
import { VisuallyHidden } from "@dialmade/ui";
import type { RenderContext } from "../../../types";
import { BoardPanel } from "../../BoardPanel";
import { formatHex } from "../../lib/format";
import type { BrandSystem } from "../../lib/system";
import { SCALE_GROUPS, SCALE_NAMES, SCALE_STEPS, type ScaleGroup } from "../constants";
import { PALETTE_COPY } from "../copy";
import "./PaletteScales.css";

export interface PaletteScalesProps {
  ctx: RenderContext;
  system: BrandSystem | undefined;
}

function anchorOf(group: ScaleGroup, system: BrandSystem | undefined): number | undefined {
  if (group === "brand") return system?.theme.anchors.brand;
  if (group === "cta") return system?.theme.anchors.accent;
  return undefined;
}

/** One 50–950 ramp per scale group, painted with the scale variables; the anchor step is marked. */
export function PaletteScales({ ctx, system }: PaletteScalesProps) {
  const copy = PALETTE_COPY[ctx.locale];
  const groups = SCALE_GROUPS.filter((group) => group !== "cta" || !system || system.theme.scales.accent);

  return (
    <BoardPanel label={copy.scales} meta={system ? `● ${copy.anchor}` : undefined}>
      <div className="dl-brand-palette-scales">
        <div className="dl-brand-palette-scales__row" aria-hidden="true">
          <span />
          <span className="dl-brand-palette-scales__steps">
            {SCALE_STEPS.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </span>
        </div>
        {groups.map((group) => {
          const label = SCALE_NAMES[group][ctx.locale];
          const hexes = system?.tokens.light.scales[group];
          const anchor = anchorOf(group, system);
          return (
            <div key={group} className="dl-brand-palette-scales__row">
              <span className="dl-brand-palette-scales__name" aria-hidden="true">
                {label}
              </span>
              <ul className="dl-brand-palette-scales__ramp" aria-label={label}>
                {SCALE_STEPS.map((step) => {
                  const hex = formatHex(hexes?.[step]);
                  const isAnchor = step === anchor;
                  return (
                    <li
                      key={step}
                      className="dl-brand-palette-scales__step"
                      data-anchor={isAnchor ? "" : undefined}
                      title={hex || undefined}
                      style={{ "--_palette-step": `var(--color-${group}-${step})` } as CSSProperties}
                    >
                      <VisuallyHidden>{[String(step), hex, isAnchor ? `(${copy.anchor})` : ""].filter(Boolean).join(" ")}</VisuallyHidden>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </BoardPanel>
  );
}
