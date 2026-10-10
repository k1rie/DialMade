import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { landing, type Locale } from "@/i18n";

/** What the Modo Layout window above is: the idea in one headline and its three promises. */
export function LayoutSection({ locale }: { locale: Locale }) {
  const t = landing[locale].demo;
  return (
    <section id="modo-layout" aria-labelledby="layout-title" className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-28">
      <Reveal>
        <SectionHeading id="layout-title" eyebrow={t.eyebrow} title={t.title} subtitle={t.body} align="center" />
      </Reveal>
      <ul className="mx-auto mt-12 grid max-w-[960px] grid-cols-1 gap-4 sm:grid-cols-3">
        {t.points.map((point, i) => (
          <Reveal as="li" key={point} delay={i * 0.05} className="min-w-0">
            <div className="flex h-full items-start gap-3 rounded-card border border-app bg-surface/40 p-5 text-body text-muted shadow-surface">
              <svg aria-hidden viewBox="0 0 16 16" fill="none" className="mt-1 size-4 shrink-0 text-accent">
                <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {point}
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
