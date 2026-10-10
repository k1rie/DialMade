import type { CSSProperties } from "react";
import type { SectionComponentProps } from "../../types";
import { BoardPanel } from "../BoardPanel";
import { BoardSection } from "../BoardSection";
import { BrandMark, type BrandMarkLayout } from "../BrandMark";
import { textOr } from "../lib/board";
import { IDENTITY_COPY } from "./copy";
import type { IdentityProps } from "./definition";
import "./Identity.css";

const SURFACES = [
  { id: "light", token: "neutral-50" },
  { id: "dark", token: "neutral-950" },
  { id: "brand", token: "primary" },
] as const;

const SIZES = [48, 32, 24] as const;
const VERSIONS: readonly BrandMarkLayout[] = ["lockup", "stacked", "symbol", "wordmark"];

/** 01 · Identity: the logo on three surfaces, its clear space, minimum size and versions. */
export function Identity({ title, intro, showClearSpace, showSizes, variant, ctx, elementId }: SectionComponentProps<IdentityProps>) {
  const copy = IDENTITY_COPY[ctx.locale];
  const { name, logoUrl } = ctx.brand;
  const kind = logoUrl ? "image" : "monogram";

  return (
    <BoardSection
      elementId={elementId}
      ctx={ctx}
      type="brand.identity"
      title={textOr(title, copy.title)}
      intro={textOr(intro, copy.intro)}
      variant={variant}
      className="dl-brand-identity"
    >
      <ul className="dl-brand-identity__surfaces" data-layout={variant === "spotlight" ? "spotlight" : "row"}>
        {SURFACES.map((surface) => (
          <li key={surface.id} className="dl-brand-identity__surface" data-surface={surface.id}>
            <div className="dl-brand-identity__stage">
              <BrandMark name={name} logoUrl={logoUrl} surface={surface.id} />
            </div>
            <p className="dl-brand-identity__caption">
              <span>{copy.surfaces[surface.id]}</span>
              <code>{surface.token}</code>
            </p>
          </li>
        ))}
      </ul>

      {(showClearSpace || showSizes) && (
        <div className="dl-brand-identity__rules">
          {showClearSpace && (
            <BoardPanel label={copy.clearSpace} className="dl-brand-identity__rule">
              <div className="dl-brand-identity__clearspace" data-kind={kind} aria-hidden="true">
                <div className="dl-brand-identity__safe">
                  <span className="dl-brand-identity__x" data-side="top">
                    x
                  </span>
                  <span className="dl-brand-identity__x" data-side="right">
                    x
                  </span>
                  <span className="dl-brand-identity__x" data-side="bottom">
                    x
                  </span>
                  <span className="dl-brand-identity__x" data-side="left">
                    x
                  </span>
                  <div className="dl-brand-identity__bounds">
                    <BrandMark name={name} logoUrl={logoUrl} decorative />
                  </div>
                </div>
              </div>
              <p className="dl-brand-identity__note">{copy.clearSpaceBody[kind]}</p>
            </BoardPanel>
          )}

          {showSizes && (
            <BoardPanel label={copy.minSize} meta="24 px" className="dl-brand-identity__rule">
              <ul className="dl-brand-identity__sizes">
                {SIZES.map((size, index) => (
                  <li key={size} className="dl-brand-identity__size" data-kind={kind} style={{ "--_identity-h": `${size}px` } as CSSProperties}>
                    <BrandMark name={name} logoUrl={logoUrl} decorative />
                    <span className="dl-brand-identity__size-label">
                      {size} px{index === SIZES.length - 1 ? ` · ${copy.minLabel}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="dl-brand-identity__note">{copy.minSizeBody}</p>
            </BoardPanel>
          )}

          {showSizes && !logoUrl && (
            <BoardPanel label={copy.versions} className="dl-brand-identity__rule">
              <ul className="dl-brand-identity__versions">
                {VERSIONS.map((layout) => (
                  <li key={layout} className="dl-brand-identity__version">
                    <span className="dl-brand-identity__version-stage">
                      <BrandMark name={name} layout={layout} decorative />
                    </span>
                    <span className="dl-brand-identity__size-label">{copy.versionNames[layout]}</span>
                  </li>
                ))}
              </ul>
            </BoardPanel>
          )}
        </div>
      )}
    </BoardSection>
  );
}
