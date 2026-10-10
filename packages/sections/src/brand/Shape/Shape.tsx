import type { CSSProperties } from "react";
import { Button } from "@dialmade/ui";
import type { SectionComponentProps } from "../../types";
import { BoardPanel } from "../BoardPanel";
import { BoardSection } from "../BoardSection";
import { textOr } from "../lib/board";
import { formatPx } from "../lib/format";
import { brandSystem } from "../lib/system";
import { SHAPE_COPY } from "./copy";
import type { ShapeProps } from "./definition";
import { DialMeter } from "./DialMeter";
import "./Shape.css";

const RADII = ["sm", "md", "lg", "xl", "full"] as const;
const ELEVATIONS = ["none", "sm", "md", "lg"] as const;
const SPACES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const DIALS = ["density", "variance", "motion"] as const;
const BUTTON_SIZES = [
  ["sm", "hSm"],
  ["md", "hMd"],
  ["lg", "hLg"],
] as const;

/** 04 · Shape: radii, elevation, borders and focus, spacing scale, control heights and the dials. */
export function Shape({ title, intro, showSpacing, variant, ctx, elementId }: SectionComponentProps<ShapeProps>) {
  const copy = SHAPE_COPY[ctx.locale];
  const { locale } = ctx;
  const system = brandSystem(ctx);
  const tokens = system?.tokens[ctx.mode];
  const summary = variant === "summary";
  const flat = system?.inputs.recipe.shadow === "none";
  const px = (value: number | undefined) => (value === undefined ? undefined : formatPx(value, locale));

  const radius = (
    <BoardPanel label={copy.radius} className="dl-brand-shape__panel" data-area="radius">
      <ul className="dl-brand-shape__radii">
        {RADII.map((name) => (
          <li key={name} className="dl-brand-shape__radius" data-radius={name}>
            <span className="dl-brand-shape__radius-box" aria-hidden="true" />
            <span className="dl-brand-shape__label">
              <span>{name}</span>
              {tokens && <code>{name === "full" ? "∞" : px(tokens.radius[name])}</code>}
            </span>
          </li>
        ))}
      </ul>
    </BoardPanel>
  );

  const elevation = (
    <BoardPanel label={copy.elevation} className="dl-brand-shape__panel" data-area="elevation">
      <ul className="dl-brand-shape__elevations">
        {ELEVATIONS.map((name) => (
          <li key={name} className="dl-brand-shape__elevation" data-elevation={name}>
            <span className="dl-brand-shape__label">
              <span>{name === "none" ? copy.flat : name}</span>
            </span>
          </li>
        ))}
      </ul>
      {flat && <p className="dl-brand-shape__note">{copy.noShadows}</p>}
    </BoardPanel>
  );

  const borders = (
    <BoardPanel label={copy.borders} meta={px(tokens?.borderWidth)} className="dl-brand-shape__panel" data-area="borders">
      <ul className="dl-brand-shape__borders">
        <li className="dl-brand-shape__border" data-border="border">
          <span className="dl-brand-shape__border-sample" aria-hidden="true" />
          <span className="dl-brand-shape__label">
            <span>{copy.border}</span>
            <code>--border</code>
          </span>
        </li>
        <li className="dl-brand-shape__border" data-border="strong">
          <span className="dl-brand-shape__border-sample" aria-hidden="true" />
          <span className="dl-brand-shape__label">
            <span>{copy.borderStrong}</span>
            <code>--border-strong</code>
          </span>
        </li>
        <li className="dl-brand-shape__border" data-border="ring">
          <span className="dl-brand-shape__border-sample" aria-hidden="true" />
          <span className="dl-brand-shape__label">
            <span>{copy.focus}</span>
            <code>--ring</code>
          </span>
        </li>
      </ul>
    </BoardPanel>
  );

  const spacing = (
    <BoardPanel label={copy.spacing} className="dl-brand-shape__panel" data-area="spacing">
      <ul className="dl-brand-shape__spaces">
        {SPACES.map((step) => (
          <li key={step} className="dl-brand-shape__space">
            <code className="dl-brand-shape__space-step">{step}</code>
            <span
              className="dl-brand-shape__space-bar"
              aria-hidden="true"
              style={{ "--_shape-space": `var(--dl-space-${step})` } as CSSProperties}
            />
            {tokens && <code className="dl-brand-shape__space-value">{px(tokens.space[step - 1])}</code>}
          </li>
        ))}
      </ul>
    </BoardPanel>
  );

  const controls = (
    <BoardPanel label={copy.controls} className="dl-brand-shape__panel" data-area="controls">
      <div className="dl-brand-shape__dials">
        {DIALS.map((dial) => {
          const value = tokens?.dials[dial] ?? 5;
          return <DialMeter key={dial} label={copy.dials[dial]} value={value} valueText={copy.dialValue(value)} />;
        })}
      </div>
      <div className="dl-brand-shape__controls">
        <p className="dl-brand-shape__subhead">{copy.controlHeights}</p>
        <ul className="dl-brand-shape__buttons">
          {BUTTON_SIZES.map(([size, key]) => (
            <li key={size}>
              <Button size={size} variant="secondary" tabIndex={-1}>
                {size.toUpperCase()}
              </Button>
              {tokens && <code>{px(tokens.components.button[key])}</code>}
            </li>
          ))}
        </ul>
        {tokens && (
          <dl className="dl-brand-shape__specs">
            <div>
              <dt>{copy.tableRow}</dt>
              <dd>{px(tokens.components.table.rowH)}</dd>
            </div>
            <div>
              <dt>{copy.cardPadding}</dt>
              <dd>{px(tokens.components.card.padding.px)}</dd>
            </div>
          </dl>
        )}
      </div>
    </BoardPanel>
  );

  return (
    <BoardSection
      elementId={elementId}
      ctx={ctx}
      type="brand.shape"
      title={textOr(title, copy.title)}
      intro={textOr(intro, copy.intro)}
      variant={summary ? "summary" : "tiles"}
      className="dl-brand-shape"
    >
      <div className="dl-brand-shape__grid" data-layout={summary ? "summary" : "tiles"} data-spacing={showSpacing ? "" : undefined}>
        {radius}
        {elevation}
        {borders}
        {showSpacing && !summary && spacing}
        {showSpacing && controls}
      </div>
    </BoardSection>
  );
}
