import { DialMark } from "@/components/DialMark";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { common, landing, type Locale } from "@/i18n";
import { REPO_URL, startLayoutUrl } from "@/lib/links";
import { LocaleSwitch } from "@/components/LocaleSwitch";

export function SiteNav({ locale }: { locale: Locale }) {
  const t = landing[locale];
  const links = [
    { href: "#layout", label: t.nav.layout },
    { href: "#como-funciona", label: t.nav.how },
    { href: "#funciones", label: t.nav.features },
    { href: "#open-source", label: t.nav.openSource },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-app glass">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-4 sm:px-6">
        <a href={`/${locale}`} className="flex items-center gap-2 text-fg" aria-label={common[locale].app.home}>
          <DialMark className="size-6" />
          <span className="text-[1.0625rem] font-semibold tracking-[-0.02em]">{common[locale].app.name}</span>
        </a>
        <nav aria-label={t.nav.label} className="hidden lg:block">
          <ul className="flex items-center gap-6">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-small text-muted transition-colors duration-150 hover:text-fg">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LocaleSwitch locale={locale} />
          <span className="hidden sm:contents">
            <ButtonLink href={REPO_URL} variant="secondary">
              {t.nav.github}
            </ButtonLink>
          </span>
          {/* Sticky, so it shares every screen with a section's own CTA: no halo here, the glow stays on that one. */}
          <ButtonLink href={startLayoutUrl(locale)} variant="accent">
            {t.hero.primary}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
