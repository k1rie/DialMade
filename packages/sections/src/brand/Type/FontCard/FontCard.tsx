import "./FontCard.css";

export interface FontCardProps {
  role: "heading" | "body";
  /** «Titulares» / «Texto». */
  roleLabel: string;
  family?: string;
  details?: string;
}

/** Specimen card of one family of the pairing: a large «Aa» in that font, its name and weights. */
export function FontCard({ role, roleLabel, family, details }: FontCardProps) {
  return (
    <article className="dl-brand-type-font" data-role={role}>
      <span className="dl-brand-type-font__glyph" aria-hidden="true">
        Aa
      </span>
      <div className="dl-brand-type-font__meta">
        <p className="dl-brand-type-font__role">{roleLabel}</p>
        <h3 className="dl-brand-type-font__family">{family ?? roleLabel}</h3>
        {details && <p className="dl-brand-type-font__details">{details}</p>}
      </div>
    </article>
  );
}
