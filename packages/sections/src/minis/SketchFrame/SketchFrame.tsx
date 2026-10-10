import type { OutputKind } from "@dialmade/catalog";
import { Icon } from "@dialmade/ui";
import type { ReactNode } from "react";
import { monogramOf } from "../../content";
import { cx } from "../../lib/cx";
import type { ContentContext } from "../../types";
import { sketchLabel } from "../labels";
import { SKETCH_COPY } from "../sketchCopy";
import "./SketchFrame.css";

export interface SketchFrameProps {
  kind: OutputKind;
  ctx: ContentContext;
  className?: string;
  children: ReactNode;
}

/**
 * Shared shell of the sketches: the brand-tinted 8:5 canvas, the «Esquema» tag and one accessible image
 * that says it is not the final design. The parts inside use the `dl-sketch__box` classes.
 */
export function SketchFrame({ kind, ctx, className, children }: SketchFrameProps) {
  return (
    <div className={cx("dl-sketch", className)} data-kind={kind} role="img" lang={ctx.locale} aria-label={sketchLabel(kind, ctx.locale, ctx.brand.name)}>
      <span className="dl-sketch__tag" aria-hidden="true">
        <Icon name="edit" />
        {SKETCH_COPY.tag[ctx.locale]}
      </span>
      <div className="dl-sketch__canvas">{children}</div>
    </div>
  );
}

/** The brand as the sketch shows it: the logo on a light plate (it must read in dark mode too) plus the name. */
export function SketchLogo({ ctx, withName = true }: { ctx: ContentContext; withName?: boolean }) {
  const { name, logoUrl } = ctx.brand;
  return (
    <span className="dl-sketch__logo">
      <span className="dl-sketch__logo-plate" data-logo={logoUrl ? "" : undefined}>
        {logoUrl ? <img className="dl-sketch__logo-image" src={logoUrl} alt="" /> : monogramOf(name)}
      </span>
      {withName && <span className="dl-sketch__logo-name">{name}</span>}
    </span>
  );
}
