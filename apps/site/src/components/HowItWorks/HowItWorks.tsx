import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { landing, type Locale } from "@/i18n";
import { cn } from "@/lib/cn";
import { StepArt } from "./StepArt";
import { StepCard } from "./StepCard";

/** Five steps: three cards on the first row, two wide ones on the second. */
export function HowItWorks({ locale }: { locale: Locale }) {
  const t = landing[locale].how;
  return (
    <section id="como-funciona" aria-labelledby="how-title" className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-28">
      <Reveal>
        <SectionHeading id="how-title" eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      </Reveal>
      <ol className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        {t.steps.map((step, i) => (
          <Reveal as="li" key={step.n} delay={Math.min(i, 2) * 0.05} className={cn("min-w-0", i < 3 ? "lg:col-span-2" : "lg:col-span-3", i === 4 && "md:col-span-2 lg:col-span-3")}>
            <StepCard n={step.n} word={step.word} title={step.title} body={step.body} art={<StepArt step={i} locale={locale} />} />
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
