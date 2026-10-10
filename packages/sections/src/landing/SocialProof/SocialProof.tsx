import { LandingSection } from "../LandingSection";
import { landingStrings } from "../lib/strings";
import type { SectionComponentProps } from "../../types";
import { FictionalLogo } from "./FictionalLogo";
import type { SocialProofProps } from "./types";
import "./SocialProof.css";

export function SocialProof({
  title,
  logos,
  stats,
  showStats,
  align,
  emphasis,
  background,
  spacing,
  variant,
  ctx,
  elementId,
}: SectionComponentProps<SocialProofProps>) {
  const strings = landingStrings(ctx.locale);
  const titleId = `${elementId}-title`;
  const metrics = variant === "metrics";

  const logoList =
    logos.length > 0 ? (
      <ul className="dl-landing-proof__logos" role="list" aria-label={strings.logos}>
        {logos.map((name, i) => (
          <li key={`${i}-${name}`} className="dl-landing-proof__logo" data-dl-prop={`logos/${i}`}>
            <FictionalLogo name={name} />
          </li>
        ))}
      </ul>
    ) : null;

  const statList =
    (metrics || showStats) && stats.length > 0 ? (
      <dl className="dl-landing-proof__stats" data-count={stats.length}>
        {stats.map((stat, i) => (
          <div key={`${i}-${stat.label}`} className="dl-landing-proof__stat">
            <dt className="dl-landing-proof__stat-label" data-dl-prop={`stats/${i}/label`}>
              {stat.label}
            </dt>
            <dd className="dl-landing-proof__stat-value" data-dl-prop={`stats/${i}/value`}>
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    ) : null;

  return (
    <LandingSection
      className="dl-landing-proof"
      variant={variant}
      align={align}
      emphasis={emphasis}
      background={background}
      spacing={spacing}
      labelledBy={titleId}
    >
      <h2 id={titleId} className="dl-landing-proof__title" data-dl-prop="title">
        {title}
      </h2>
      {metrics ? (
        <>
          {statList}
          {logoList}
        </>
      ) : (
        <>
          {logoList}
          {statList}
        </>
      )}
    </LandingSection>
  );
}
