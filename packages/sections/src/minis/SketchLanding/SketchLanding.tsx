import { SketchFrame, SketchLogo } from "../SketchFrame";
import { SKETCH_COPY as copy } from "../sketchCopy";
import type { MiniProps } from "../types";
import "./SketchLanding.css";

/** Landing page sketch: nav with the logo, hero with the main action in the brand color and three benefits. */
export function SketchLanding({ ctx, className }: MiniProps) {
  const l = ctx.locale;
  return (
    <SketchFrame kind="landing" ctx={ctx} className={className}>
      <div className="dl-sketch-landing">
        <div className="dl-sketch__box dl-sketch-landing__nav">
          <SketchLogo ctx={ctx} />
          <span className="dl-sketch-landing__menu">
            {[0, 1, 2].map((index) => (
              <span key={index}>{copy.menu[l]}</span>
            ))}
          </span>
        </div>
        <div className="dl-sketch__box dl-sketch-landing__hero">
          <span className="dl-sketch__strong dl-sketch-landing__headline">{copy.headline[l]}</span>
          <span className="dl-sketch__hint">{copy.subtitle[l]}</span>
          <span className="dl-sketch-landing__actions">
            <span className="dl-sketch__box dl-sketch__fill dl-sketch-landing__button">{copy.mainAction[l]}</span>
            <span className="dl-sketch__box dl-sketch-landing__button">{copy.secondary[l]}</span>
          </span>
        </div>
        <div className="dl-sketch__row dl-sketch-landing__benefits">
          {[0, 1, 2].map((index) => (
            <span key={index} className="dl-sketch__box dl-sketch-landing__benefit">
              {copy.benefit[l]}
              <span className="dl-sketch__hint">{copy.iconAndText[l]}</span>
            </span>
          ))}
        </div>
      </div>
    </SketchFrame>
  );
}
