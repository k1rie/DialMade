import { cn } from "@/lib/cn";

export type SectionHeadingProps = {
  id?: string;
  eyebrow: string;
  /** A pair renders as two lines, so the title breaks between its two phrases and never mid-phrase. */
  title: string | [string, string];
  subtitle?: string;
  align?: "start" | "center";
  className?: string;
};

/** Eyebrow + H2 + subtitle used by every section (H1 and Body of DESIGN-BRIEF §3). */
export function SectionHeading({ id, eyebrow, title, subtitle, align = "start", className }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" && "items-center text-center", className)}>
      <p className="font-mono text-caption text-accent">{eyebrow}</p>
      <h2 id={id} className="max-w-[22ch] text-h1 text-balance text-fg">
        {typeof title === "string"
          ? title
          : title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
      </h2>
      {subtitle ? <p className="max-w-[56ch] text-body text-muted">{subtitle}</p> : null}
    </div>
  );
}
