import type { CSSProperties } from "react";
import type { Locale } from "@dialmade/catalog";
import type { ResolvedTokens } from "@dialmade/doc";
import { featureList, heroCopy, relativeTime, sectionHeading } from "../../content";
import type { SectionComponentProps } from "../../types";
import { BoardPanel } from "../BoardPanel";
import { BoardSection } from "../BoardSection";
import { textOr } from "../lib/board";
import { formatNumber, formatPx } from "../lib/format";
import { brandSystem } from "../lib/system";
import { GLYPHS, TYPE_COPY } from "./copy";
import type { TypeProps } from "./definition";
import { FontCard } from "./FontCard";
import { TypeScale, type TypeScaleStep } from "./TypeScale";
import "./Type.css";

type Copy = (typeof TYPE_COPY)[Locale];

const HEADING_STEPS = new Set(["display", "h1", "h2", "h3"]);
const STEP_IDS: readonly TypeScaleStep["id"][] = ["display", "h1", "h2", "h3", "body", "small", "caption"];

function categoryOf(fallback: string, copy: Copy): string {
  if (/monospace/.test(fallback)) return copy.categories.mono;
  if (/(^|[\s,])serif/.test(fallback.replace(/sans-serif/g, ""))) return copy.categories.serif;
  if (/cursive|fantasy/.test(fallback)) return copy.categories.display;
  return copy.categories.sans;
}

function stepMeta(id: TypeScaleStep["id"], tokens: ResolvedTokens, locale: Locale): string {
  const size = tokens.fontSizes[id];
  const heading = HEADING_STEPS.has(id);
  const lineHeight = heading ? tokens.lineHeights.tight : tokens.lineHeights.body;
  const weight = heading ? tokens.heading.weight : tokens.bodyWeight;
  return `${formatPx(size.px, locale, size.minPx)} · ${formatNumber(lineHeight, locale)} · ${weight}`;
}

/** 03 · Typography: the pairing as a specimen, the real scale and the weights of the headline family. */
export function Type({ title, intro, sample, showGlyphs, variant, ctx, elementId }: SectionComponentProps<TypeProps>) {
  const copy = TYPE_COPY[ctx.locale];
  const system = brandSystem(ctx);
  const specimen = variant !== "scale";
  const pairing = system?.inputs.pairing;
  const tokens = system?.tokens[ctx.mode];
  const fonts = tokens?.fonts;
  const single = pairing ? pairing.heading.family === pairing.body.family : false;

  const hero = heroCopy(ctx);
  const features = featureList(ctx, 2);
  const samples: Record<TypeScaleStep["id"], string> = {
    display: textOr(sample, ctx.brand.name),
    h1: hero.title,
    h2: sectionHeading(ctx, "features").title,
    h3: features[0]?.title ?? hero.title,
    body: hero.subtitle,
    small: features[1]?.description ?? hero.subtitle,
    caption: `${hero.eyebrow} · ${relativeTime(12, ctx.locale)}`,
  };
  const steps: TypeScaleStep[] = STEP_IDS.map((id) => ({
    id,
    label: copy.steps[id],
    ...(tokens && { meta: stepMeta(id, tokens, ctx.locale) }),
    sample: samples[id],
  }));

  const weightLabel = (weight: number) => `${weight} ${copy.weightNames[weight] ?? ""}`.trim();
  const headingWeights = fonts?.heading.weights ?? [];
  const details = (role: "heading" | "body") =>
    pairing && fonts ? [categoryOf(pairing[role].fallback, copy), fonts[role].weights.join(" · ")].join(" · ") : undefined;
  const headingDetails = details("heading");
  const bodyDetails = details("body");
  const monoSample = ["--primary", tokens?.colors.primary?.toUpperCase(), "16px", "0.2s"]
    .filter(Boolean)
    .join(" · ");

  return (
    <BoardSection
      elementId={elementId}
      ctx={ctx}
      type="brand.type"
      title={textOr(title, copy.title)}
      intro={textOr(intro, copy.intro)}
      variant={specimen ? "specimen" : "scale"}
      className="dl-brand-type"
      aside={
        !specimen && pairing ? (
          <p className="dl-brand-type__pairing">
            {single ? pairing.heading.family : `${pairing.heading.family} + ${pairing.body.family}`}
          </p>
        ) : undefined
      }
    >
      {specimen && (
        <div className="dl-brand-type__fonts">
          <FontCard
            role="heading"
            roleLabel={tokens ? `${copy.headings} · ${tokens.heading.weight}` : copy.headings}
            {...(pairing && { family: pairing.heading.family })}
            {...(headingDetails && { details: headingDetails })}
          />
          <FontCard
            role="body"
            roleLabel={tokens ? `${copy.body} · ${tokens.bodyWeight}` : copy.body}
            {...(pairing && { family: pairing.body.family })}
            {...(bodyDetails && { details: bodyDetails })}
          />
        </div>
      )}

      <BoardPanel label={copy.scale}>
        <TypeScale label={copy.scale} steps={steps} />
      </BoardPanel>

      {specimen && (headingWeights.length > 0 || showGlyphs) && (
        <div className="dl-brand-type__extras">
          {headingWeights.length > 0 && (
            <BoardPanel label={copy.weights} meta={pairing?.heading.family}>
              <ul className="dl-brand-type__weights">
                {headingWeights.map((weight) => (
                  <li key={weight} className="dl-brand-type__weight">
                    <span className="dl-brand-type__weight-glyph" style={{ "--_type-weight": weight } as CSSProperties} aria-hidden="true">
                      Aa
                    </span>
                    <span className="dl-brand-type__weight-name">{weightLabel(weight)}</span>
                  </li>
                ))}
              </ul>
            </BoardPanel>
          )}
          {showGlyphs && (
            <BoardPanel label={copy.glyphs} meta={pairing?.body.family}>
              <div className="dl-brand-type__glyphs">
                {GLYPHS.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <p className="dl-brand-type__mono">
                <span>{fonts?.mono.family ? `${copy.mono} · ${fonts.mono.family}` : copy.systemMono}</span>
                <code>{monoSample}</code>
              </p>
            </BoardPanel>
          )}
        </div>
      )}
    </BoardSection>
  );
}
