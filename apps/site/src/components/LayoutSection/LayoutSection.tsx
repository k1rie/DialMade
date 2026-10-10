import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { landing, type Locale } from "@/i18n";
import { LayoutDemo } from "./LayoutDemo";

/** The star: copy on the left, the live Modo Layout canvas on the right (FLORA «One canvas»). */
export function LayoutSection({ locale }: { locale: Locale }) {
  const t = landing[locale].demo;
  const blockNames = landing[locale].blocks;
  return (
    <section id="layout" aria-labelledby="layout-title" className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-28">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <Reveal className="flex min-w-0 flex-col gap-8">
          <SectionHeading id="layout-title" eyebrow={t.eyebrow} title={t.title} subtitle={t.body} />
          <ul className="flex flex-col gap-3">
            {t.points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-body text-muted">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {point}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.06} className="flex min-w-0 flex-col gap-3">
          <LayoutDemo t={t} blockNames={blockNames} />
          <p className="text-small text-muted">{t.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
