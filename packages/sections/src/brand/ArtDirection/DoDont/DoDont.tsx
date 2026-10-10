import { Icon } from "@dialmade/ui";
import { BrandMark } from "../../BrandMark";
import type { ArtCopy } from "../copy";
import "./DoDont.css";

export interface DoDontProps {
  copy: ArtCopy;
  dos: readonly string[];
  donts: readonly string[];
  brandName: string;
  logoUrl?: string;
  /** Cards with an illustration for the first two rules of each column (Guidelines variant). */
  withVisuals?: boolean;
}

type Tone = "do" | "dont";

function Visual({ tone, index, brandName, logoUrl }: { tone: Tone; index: number; brandName: string; logoUrl?: string }) {
  if (index > 1) return null;
  const kind = tone === "do" ? (index === 0 ? "action" : "space") : index === 0 ? "contrast" : "distort";
  return (
    <span className="dl-brand-dodont__visual" data-visual={kind} aria-hidden="true">
      {kind === "action" && (
        <>
          <span className="dl-brand-dodont__fake-button" data-variant="primary" />
          <span className="dl-brand-dodont__fake-button" data-variant="ghost" />
        </>
      )}
      {kind === "contrast" && <span className="dl-brand-dodont__low">Aa</span>}
      {(kind === "space" || kind === "distort") && (
        <span className="dl-brand-dodont__logo">
          <BrandMark name={brandName} logoUrl={logoUrl} decorative />
        </span>
      )}
    </span>
  );
}

/** Two columns of rules: what to do with the brand and what to avoid. */
export function DoDont({ copy, dos, donts, brandName, logoUrl, withVisuals }: DoDontProps) {
  const columns: { tone: Tone; title: string; items: readonly string[] }[] = [
    { tone: "do", title: copy.do, items: dos },
    { tone: "dont", title: copy.dont, items: donts },
  ];
  return (
    <div className="dl-brand-dodont" data-visuals={withVisuals ? "" : undefined}>
      {columns.map((column) => (
        <div key={column.tone} className="dl-brand-dodont__column" data-tone={column.tone}>
          <h3 className="dl-brand-dodont__title">
            <Icon name={column.tone === "do" ? "check-circle" : "alert-circle"} />
            {column.title}
          </h3>
          <ul className="dl-brand-dodont__list">
            {column.items.map((item, index) => (
              <li key={index} className="dl-brand-dodont__item">
                {withVisuals && <Visual tone={column.tone} index={index} brandName={brandName} {...(logoUrl && { logoUrl })} />}
                <span className="dl-brand-dodont__text">
                  <Icon name={column.tone === "do" ? "check" : "x"} />
                  <span>{item}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
