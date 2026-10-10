import "./DialMeter.css";

export interface DialMeterProps {
  label: string;
  value: number;
  /** Accessible value («5 de 10»). */
  valueText: string;
}

const SEGMENTS = Array.from({ length: 10 }, (_, i) => i + 1);

/** A 1–10 dial of the brief as ten segments. */
export function DialMeter({ label, value, valueText }: DialMeterProps) {
  return (
    <div className="dl-brand-dial" role="meter" aria-label={label} aria-valuemin={1} aria-valuemax={10} aria-valuenow={value} aria-valuetext={valueText}>
      <span className="dl-brand-dial__label">
        <span>{label}</span>
        <code>{value}/10</code>
      </span>
      <span className="dl-brand-dial__track" aria-hidden="true">
        {SEGMENTS.map((segment) => (
          <span key={segment} className="dl-brand-dial__segment" data-on={segment <= value ? "" : undefined} />
        ))}
      </span>
    </div>
  );
}
