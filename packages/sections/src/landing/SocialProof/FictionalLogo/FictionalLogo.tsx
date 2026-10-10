import { hashString } from "../../../content";
import { cx } from "../../../lib/cx";
import { LOGO_MARKS, WORDMARK_STYLES } from "./marks";
import "./FictionalLogo.css";

export interface FictionalLogoProps {
  name: string;
  className?: string;
}

/** A made-up logo for a made-up company: a geometric mark and a wordmark, both chosen from the name. */
export function FictionalLogo({ name, className }: FictionalLogoProps) {
  const hash = hashString(name);
  const mark = LOGO_MARKS[hash % LOGO_MARKS.length];
  const style = (hash >>> 8) % WORDMARK_STYLES;
  return (
    <span className={cx("dl-landing-logo", className)} data-style={style}>
      <svg className="dl-landing-logo__mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {mark}
      </svg>
      <span className="dl-landing-logo__word">{name}</span>
    </span>
  );
}
