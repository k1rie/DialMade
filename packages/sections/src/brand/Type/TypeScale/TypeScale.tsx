import "./TypeScale.css";

export interface TypeScaleStep {
  id: "display" | "h1" | "h2" | "h3" | "body" | "small" | "caption";
  label: string;
  /** Size, line height and weight («56 px · 1,15 · 600»). */
  meta?: string;
  sample: string;
}

export interface TypeScaleProps {
  label: string;
  steps: readonly TypeScaleStep[];
}

/** Every step of the type scale, each sample at its real size. */
export function TypeScale({ label, steps }: TypeScaleProps) {
  return (
    <ol className="dl-brand-type-scale" aria-label={label}>
      {steps.map((step) => (
        <li key={step.id} className="dl-brand-type-scale__step">
          <div className="dl-brand-type-scale__meta">
            <span className="dl-brand-type-scale__name">{step.label}</span>
            {step.meta && <code>{step.meta}</code>}
          </div>
          <p className="dl-brand-type-scale__sample" data-step={step.id}>
            {step.sample}
          </p>
        </li>
      ))}
    </ol>
  );
}
