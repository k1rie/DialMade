export type FeatureCardProps = { title: string; body: string; tag: string };

/** A fine-bordered «ficha» with a mono tag (Save.design). */
export function FeatureCard({ title, body, tag }: FeatureCardProps) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-card border border-app bg-surface/40 p-5 shadow-surface transition-colors duration-150 hover:border-app-strong">
      {/* Neutral: the purple accent is for focus, selection and valid drops (DESIGN-BRIEF §2). */}
      <p className="self-start rounded-chip border border-app bg-white/[0.04] px-2 py-0.5 font-mono text-caption text-muted">
        {tag}
      </p>
      <h3 className="text-h3 text-fg">{title}</h3>
      <p className="text-small text-muted">{body}</p>
    </article>
  );
}
