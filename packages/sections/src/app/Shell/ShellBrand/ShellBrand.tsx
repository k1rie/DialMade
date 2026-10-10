import { monogramOf } from "../../../content/people";

export interface ShellBrandProps {
  name: string;
  logoUrl?: string;
  /** Second line under the name (plan, workspace). */
  meta?: string;
}

/** Logo (or monogram) and name of the workspace. The logo is decorative: the name is always text. */
export function ShellBrand({ name, logoUrl, meta }: ShellBrandProps) {
  return (
    <span className="dl-app-shell__brand">
      <span className="dl-app-shell__mark" data-logo={logoUrl ? "" : undefined} aria-hidden="true">
        {logoUrl ? <img className="dl-app-shell__logo" src={logoUrl} alt="" /> : monogramOf(name)}
      </span>
      <span className="dl-app-shell__brand-text">
        <span className="dl-app-shell__brand-name">{name}</span>
        {meta ? <span className="dl-app-shell__brand-meta">{meta}</span> : null}
      </span>
    </span>
  );
}
