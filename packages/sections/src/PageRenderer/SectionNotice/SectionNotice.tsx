import "./SectionNotice.css";

export interface SectionNoticeProps {
  tone: "missing" | "error";
  title: string;
  hint?: string;
}

/** Shown only in edit mode, in place of a section that is not registered or failed to render. */
export function SectionNotice({ tone, title, hint }: SectionNoticeProps) {
  return (
    <div className="dl-section-notice" data-tone={tone} role={tone === "error" ? "alert" : "note"}>
      <p className="dl-section-notice__title">{title}</p>
      {hint && <p className="dl-section-notice__hint">{hint}</p>}
    </div>
  );
}
