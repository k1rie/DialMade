import { ButtonLink } from "@/components/ui/ButtonLink";
import { landing, type Locale } from "@/i18n";
import { REPO_URL, startLayoutUrl } from "@/lib/links";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { CanvasStrip } from "./CanvasStrip";
import { FloatingBlocks } from "./FloatingBlocks";

export function Hero({ locale }: { locale: Locale }) {
  const t = landing[locale].hero;
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <FloatingBlocks locale={locale} />
      <div className="relative mx-auto flex min-h-[min(860px,calc(100dvh-4rem))] max-w-[720px] flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <p className="mb-6 rounded-chip border border-app-strong bg-surface/60 px-2.5 py-1 font-mono text-caption text-muted">
          {t.eyebrow}
        </p>
        <h1 id="hero-title" className="text-[2.5rem] leading-[2.75rem] font-semibold tracking-[-0.035em] text-balance sm:text-display sm:leading-[3.75rem]">
          <span className="block text-fg">{t.title[0]}</span>
          <span className="block text-muted">{t.title[1]}</span>
        </h1>
        <p className="mt-5 max-w-[52ch] text-body text-muted">{t.subtitle}</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <ButtonLink href={startLayoutUrl(locale)} size="lg">
            {t.primary}
            <ArrowIcon />
          </ButtonLink>
          <ButtonLink href={REPO_URL} size="lg" variant="secondary">
            {t.secondary}
          </ButtonLink>
        </div>
        <p className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-small text-muted">
          {/* Own line on phones, so a wrap never leaves a separator at the start of a line. */}
          <span className="basis-full sm:basis-auto">{t.exportsLabel}</span>
          {t.exports.map((name, i) => (
            <span key={name} className="flex items-center gap-3 font-medium text-fg/85">
              {i > 0 ? <span aria-hidden className="size-1 rounded-full bg-white/20" /> : null}
              {name}
            </span>
          ))}
        </p>
        <CanvasStrip locale={locale} />
      </div>
    </section>
  );
}
