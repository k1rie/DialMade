import { Reveal } from "@/components/Reveal";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { landing, type Locale } from "@/i18n";
import { REPO_URL, startLayoutUrl } from "@/lib/links";

export function FinalCta({ locale }: { locale: Locale }) {
  const t = landing[locale].finalCta;
  return (
    <section aria-labelledby="cta-title" className="mx-auto max-w-[1200px] px-4 pt-8 pb-24 sm:px-6 md:pb-32">
      <Reveal className="relative isolate overflow-hidden rounded-panel border border-app bg-surface/30 px-6 py-20 text-center sm:py-28">
        <span
          aria-hidden
          className="absolute top-[-60%] left-1/2 -z-10 h-[90%] w-[70%] -translate-x-1/2 rounded-full"
          style={{ background: "oklch(1 0 0 / 0.1)", filter: "blur(100px)" }}
        />
        <span
          aria-hidden
          className="absolute bottom-[-40%] left-1/2 -z-10 h-[70%] w-[46%] -translate-x-1/2 rounded-full"
          style={{ background: "oklch(0.62 0.24 300 / 0.28)", filter: "blur(110px)" }}
        />
        <h2 id="cta-title" className="mx-auto max-w-[18ch] text-h1 text-balance text-fg md:text-display">
          {t.title}
        </h2>
        <p className="mx-auto mt-5 max-w-[46ch] text-body text-pretty text-muted">{t.body}</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href={startLayoutUrl(locale)} size="lg">
            {t.primary}
            <ArrowIcon />
          </ButtonLink>
          <ButtonLink href={REPO_URL} variant="secondary" size="lg">
            {t.secondary}
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
