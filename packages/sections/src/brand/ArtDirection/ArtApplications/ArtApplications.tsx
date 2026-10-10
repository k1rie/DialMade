import { MiniApp } from "../../../minis/MiniApp";
import { MiniLanding } from "../../../minis/MiniLanding";
import type { ContentContext } from "../../../types";
import type { ArtCopy } from "../copy";
import "./ArtApplications.css";

export interface ArtApplicationsProps {
  copy: ArtCopy;
  ctx: ContentContext;
}

/** The brand applied: thumbnails of the Landing page and the Dashboard, in browser frames. */
export function ArtApplications({ copy, ctx }: ArtApplicationsProps) {
  const items = [
    { id: "landing", label: copy.landing, Mini: MiniLanding },
    { id: "app", label: copy.app, Mini: MiniApp },
  ] as const;
  return (
    <ul className="dl-brand-art-apps" aria-label={copy.applications}>
      {items.map(({ id, label, Mini }) => (
        <li key={id} className="dl-brand-art-apps__item">
          <div className="dl-brand-art-apps__stage">
            <div className="dl-brand-art-apps__window">
              <span className="dl-brand-art-apps__chrome" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <Mini ctx={ctx} className="dl-brand-art-apps__mini" />
            </div>
          </div>
          <p className="dl-brand-art-apps__label">{label}</p>
        </li>
      ))}
    </ul>
  );
}
