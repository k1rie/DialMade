import type { SectionComponentProps } from "../../types";
import { BoardPanel } from "../BoardPanel";
import { BoardSection } from "../BoardSection";
import { textOr } from "../lib/board";
import { ArtApplications } from "./ArtApplications";
import { ArtMosaic } from "./ArtMosaic";
import { ART_COPY } from "./copy";
import type { ArtDirectionProps } from "./definition";
import { DoDont } from "./DoDont";

const rulesOr = (rules: readonly string[] | undefined, fallback: readonly string[]) => {
  const filled = (rules ?? []).filter((rule) => rule.trim());
  return filled.length > 0 ? filled : fallback;
};

/** 06 · Art direction: gradients and textures from the brand, do's and don'ts, and the brand applied. */
export function ArtDirection({ title, intro, dos, donts, showApplications, variant, ctx, elementId }: SectionComponentProps<ArtDirectionProps>) {
  const copy = ART_COPY[ctx.locale];
  const guidelines = variant === "guidelines";
  const { name, logoUrl } = ctx.brand;
  const rules = (
    <DoDont
      copy={copy}
      dos={rulesOr(dos, copy.dos)}
      donts={rulesOr(donts, copy.donts)}
      brandName={name}
      {...(logoUrl && { logoUrl })}
      withVisuals={guidelines}
    />
  );
  const mosaic = <ArtMosaic copy={copy} brandName={name} compact={guidelines} />;
  const applications = showApplications && (
    <BoardPanel label={copy.applications} tone="plain">
      <ArtApplications copy={copy} ctx={ctx} />
    </BoardPanel>
  );

  return (
    <BoardSection
      elementId={elementId}
      ctx={ctx}
      type="brand.artDirection"
      title={textOr(title, copy.title)}
      intro={textOr(intro, copy.intro)}
      variant={guidelines ? "guidelines" : "moodboard"}
      className="dl-brand-art"
    >
      {guidelines ? (
        <>
          {rules}
          <BoardPanel label={copy.mosaic} tone="plain">
            {mosaic}
          </BoardPanel>
          {applications}
        </>
      ) : (
        <>
          <BoardPanel label={copy.mosaic} tone="plain">
            {mosaic}
          </BoardPanel>
          {applications}
          {rules}
        </>
      )}
    </BoardSection>
  );
}
