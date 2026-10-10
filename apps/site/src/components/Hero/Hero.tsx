import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { landing, type Locale } from "@/i18n";
import { REPO_URL, startLayoutUrl } from "@/lib/links";
import { LayoutDemo } from "./LayoutDemo";

/**
 * The product is the hero (Save.design, Railway): compact copy, then the live Modo Layout in a big
 * window that crosses the fold. The glows come from behind the window; nothing else moves.
 */
export function Hero({ locale }: { locale: Locale }) {
  const t = landing[locale];
  const h = t.hero;
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-x-clip">
      <div className="mx-auto flex max-w-[760px] flex-col items-center px-4 pt-12 text-center sm:px-6 sm:pt-16">
        <p className="mb-5 rounded-chip border border-app-strong bg-surface/60 px-2.5 py-1 font-mono text-caption text-muted">{h.eyebrow}</p>
        <h1 id="hero-title" className="text-[2.5rem] leading-[2.75rem] font-semibold tracking-[-0.035em] text-balance sm:text-display sm:leading-[3.75rem]">
          <span className="block text-fg">{h.title[0]}</span>
          <span className="block text-muted">{h.title[1]}</span>
        </h1>
        <p className="mt-4 max-w-[46ch] text-body text-muted">{h.subtitle}</p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
          <ButtonLink href={startLayoutUrl(locale)} size="lg">
            {h.primary}
            <ArrowIcon />
          </ButtonLink>
          <ButtonLink href={REPO_URL} size="lg" variant="secondary">
            {h.secondary}
          </ButtonLink>
        </div>
        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-small text-muted">
          {/* Own line on phones, so a wrap never leaves a separator at the start of a line. */}
          <span className="basis-full sm:basis-auto">{h.exportsLabel}</span>
          {h.exports.map((name, i) => (
            <span key={name} className="flex items-center gap-3 font-medium text-fg/85">
              {i > 0 ? <span aria-hidden className="size-1 rounded-full bg-white/20" /> : null}
              {name}
            </span>
          ))}
        </p>
      </div>
      <div id="layout" className="relative mx-auto mt-10 max-w-[1120px] px-4 pb-20 sm:mt-12 sm:px-6 md:pb-24">
        <span aria-hidden className="absolute -top-28 left-1/2 -z-10 h-72 w-[78%] -translate-x-1/2 rounded-full" style={{ background: "oklch(1 0 0 / 0.1)", filter: "blur(90px)" }} />
        <span aria-hidden className="absolute -bottom-10 left-1/2 -z-10 h-64 w-[56%] -translate-x-1/2 rounded-full" style={{ background: "oklch(0.62 0.24 300 / 0.26)", filter: "blur(110px)" }} />
        <LayoutDemo t={t.demo} blockNames={t.blocks} />
        <p className="mt-3 text-small text-muted">{t.demo.note}</p>
      </div>
    </section>
  );
}
