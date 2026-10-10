import { Icon } from "@dialmade/ui";
import { SketchFrame, SketchLogo } from "../SketchFrame";
import { SKETCH_BARS, SKETCH_COPY as copy } from "../sketchCopy";
import type { MiniProps } from "../types";
import "./SketchApp.css";

/** Dashboard sketch: sidebar with the active item in the brand color, search, three metrics, chart and table. */
export function SketchApp({ ctx, className }: MiniProps) {
  const l = ctx.locale;
  return (
    <SketchFrame kind="app" ctx={ctx} className={className}>
      <div className="dl-sketch-app">
        <div className="dl-sketch-app__sidebar">
          <SketchLogo ctx={ctx} />
          <span className="dl-sketch__box dl-sketch__fill dl-sketch-app__nav-item">{copy.home[l]}</span>
          {[0, 1, 2].map((index) => (
            <span key={index} className="dl-sketch__box dl-sketch-app__nav-item" data-solid="">
              {copy.section[l]}
            </span>
          ))}
        </div>
        <div className="dl-sketch-app__main">
          <div className="dl-sketch-app__top">
            <span className="dl-sketch__strong dl-sketch-app__title">{copy.title[l]}</span>
            <span className="dl-sketch__box dl-sketch-app__search">
              <Icon name="search" />
              {copy.search[l]}
            </span>
          </div>
          <div className="dl-sketch__row dl-sketch-app__metrics">
            {[0, 1, 2].map((index) => (
              <span key={index} className="dl-sketch__box dl-sketch-app__metric">
                <span className="dl-sketch__hint">{copy.metric[l]}</span>
                <span className="dl-sketch__strong dl-sketch-app__value">00</span>
              </span>
            ))}
          </div>
          <div className="dl-sketch__row dl-sketch-app__panels">
            <span className="dl-sketch__box dl-sketch-app__chart">
              <span className="dl-sketch-app__chart-label">{copy.chart[l]}</span>
              <span className="dl-sketch-app__bars">
                {SKETCH_BARS.map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </span>
            </span>
            <span className="dl-sketch__box">{copy.table[l]}</span>
          </div>
        </div>
      </div>
    </SketchFrame>
  );
}
