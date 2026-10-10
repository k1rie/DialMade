import { common, locales, type Locale } from "@/i18n";
import { cn } from "@/lib/cn";

export type LocaleSwitchProps = {
  locale: Locale;
  /**
   * A `nav` landmark named «Idioma». Only one per page may carry that name, so a second switch
   * (the footer's) passes `false` and renders a plain group.
   */
  landmark?: boolean;
  className?: string;
};

/** ES · EN as plain links: each locale is its own static route. */
export function LocaleSwitch({ locale, landmark = true, className }: LocaleSwitchProps) {
  const t = common[locale].locale;
  const Tag = landmark ? "nav" : "div";
  return (
    <Tag
      aria-label={t.label}
      role={landmark ? undefined : "group"}
      className={cn("flex items-center rounded-chip border border-app p-0.5", className)}
    >
      {locales.map((l) => (
        <a
          key={l}
          href={`/${l}`}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "page" : undefined}
          aria-label={common[l].locale[l]}
          className={cn(
            "rounded-[6px] px-2 py-1 font-mono text-caption uppercase transition-colors duration-150",
            l === locale ? "bg-white/10 text-fg" : "text-muted hover:text-fg",
          )}
        >
          {l}
        </a>
      ))}
    </Tag>
  );
}
