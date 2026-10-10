import { SketchFrame } from "../SketchFrame";
import { SKETCH_COPY as copy } from "../sketchCopy";
import type { MiniProps } from "../types";
import "./SketchBrand.css";

const TILES = [
  { surface: "light", label: copy.onLight },
  { surface: "dark", label: copy.onDark },
  { surface: "brand", label: copy.onBrand },
] as const;
const SWATCHES = [
  { swatch: "primary", label: copy.primary },
  { swatch: "tint", label: copy.tint },
  { swatch: "ink", label: copy.text },
  { swatch: "surface", label: copy.surface },
] as const;

/** Style guide sketch: the logo on light, dark and brand color, four named swatches, type and a button. */
export function SketchBrand({ ctx, className }: MiniProps) {
  const l = ctx.locale;
  const { logoUrl } = ctx.brand;
  return (
    <SketchFrame kind="brand" ctx={ctx} className={className}>
      <div className="dl-sketch-brand">
        <div className="dl-sketch__row dl-sketch-brand__tiles">
          {TILES.map(({ surface, label }) => (
            <span key={surface} className="dl-sketch__box dl-sketch-brand__tile" data-surface={surface}>
              {logoUrl ? (
                <img className="dl-sketch-brand__logo" src={logoUrl} alt="" />
              ) : (
                <span className="dl-sketch-brand__name">{ctx.brand.name}</span>
              )}
              <span className="dl-sketch__hint">{label[l]}</span>
            </span>
          ))}
        </div>
        <div className="dl-sketch__row dl-sketch-brand__swatches">
          {SWATCHES.map(({ swatch, label }) => (
            <span key={swatch} className="dl-sketch__box dl-sketch-brand__swatch" data-swatch={swatch}>
              {label[l]}
            </span>
          ))}
        </div>
        <div className="dl-sketch__row dl-sketch-brand__type">
          <span className="dl-sketch__box">
            <span className="dl-sketch__strong dl-sketch-brand__aa">Aa</span>
            <span className="dl-sketch__hint">{copy.type[l]}</span>
          </span>
          <span className="dl-sketch__box dl-sketch__fill dl-sketch-brand__button">{copy.button[l]}</span>
        </div>
      </div>
    </SketchFrame>
  );
}
