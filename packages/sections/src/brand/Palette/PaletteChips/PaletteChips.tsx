import type { CSSProperties } from "react";
import type { ColorMode, RenderContext } from "../../../types";
import { roleCssName } from "../../lib/contrast";
import { formatHex } from "../../lib/format";
import type { BrandSystem } from "../../lib/system";
import { CHIP_ROLES, ROLE_NAMES } from "../constants";
import { PALETTE_COPY } from "../copy";
import "./PaletteChips.css";

export interface PaletteChipsProps {
  ctx: RenderContext;
  system: BrandSystem | undefined;
  /** Tall chips (Swatches variant). */
  tall?: boolean;
}

/** The big color chips, painted with the live theme variables and labelled with both modes' hex. */
export function PaletteChips({ ctx, system, tall }: PaletteChipsProps) {
  const copy = PALETTE_COPY[ctx.locale];
  const other: ColorMode = ctx.mode === "light" ? "dark" : "light";
  const colors = system?.tokens;
  const roles = CHIP_ROLES.filter((role) => role !== "cta" || !colors || colors[ctx.mode].colors.cta !== colors[ctx.mode].colors.primary);

  return (
    <ul className="dl-brand-palette-chips" data-tall={tall ? "" : undefined} aria-label={copy.chips}>
      {roles.map((role) => {
        const css = roleCssName(role);
        return (
          <li key={role} className="dl-brand-palette-chips__chip" style={{ "--_palette-chip": `var(--${css})` } as CSSProperties}>
            <span className="dl-brand-palette-chips__color" aria-hidden="true" />
            <span className="dl-brand-palette-chips__name">{ROLE_NAMES[role]![ctx.locale]}</span>
            <code className="dl-brand-palette-chips__var">--{css}</code>
            {colors && (
              <span className="dl-brand-palette-chips__hex">
                <span>{formatHex(colors[ctx.mode].colors[css])}</span>
                <span className="dl-brand-palette-chips__alt">
                  {copy[other]} {formatHex(colors[other].colors[css])}
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
