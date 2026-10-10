import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { landing, type Locale } from "@/i18n";
import { FeatureCard } from "./FeatureCard";
import { FloatingNotes } from "./FloatingNotes";

/** Everything that complements the canvas: brand, AI, style guide, exports. */
export function Features({ locale }: { locale: Locale }) {
  const t = landing[locale].features;
  return (
    <section id="funciones" aria-labelledby="features-title" className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-28">
      <div className="relative py-6 xl:py-20">
        <FloatingNotes />
        <Reveal>
          <SectionHeading id="features-title" eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} align="center" />
        </Reveal>
      </div>
      <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {t.items.map((item, i) => (
          <Reveal as="li" key={item.title} delay={(i % 3) * 0.05} className="min-w-0">
            <FeatureCard title={item.title} body={item.body} tag={item.tag} />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
