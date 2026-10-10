import { DialMark } from "@/components/DialMark";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { common, landing, type Locale } from "@/i18n";
import { LICENSE_URL, REPO_URL } from "@/lib/links";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = landing[locale];
  const columns = [
    {
      title: t.footer.product,
      links: [
        { href: "#layout", label: t.nav.layout },
        { href: "#como-funciona", label: t.nav.how },
        { href: "#funciones", label: t.nav.features },
      ],
    },
    {
      title: t.footer.project,
      links: [
        { href: REPO_URL, label: t.nav.github },
        { href: LICENSE_URL, label: t.footer.license },
        { href: `${REPO_URL}/issues`, label: t.footer.contribute },
      ],
    },
  ];
  return (
    <footer className="border-t border-app">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <span className="flex items-center gap-2 text-fg">
            <DialMark className="size-5" />
            <span className="font-semibold tracking-[-0.02em]">{common[locale].app.name}</span>
          </span>
          <p className="text-small text-muted">{t.footer.tagline}</p>
          <p className="text-small text-muted">{t.footer.fictitious}</p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3">
            <p className="text-caption text-muted">{col.title}</p>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-small text-muted transition-colors duration-150 hover:text-fg">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="flex flex-col gap-3">
          <p className="text-caption text-muted">{t.footer.language}</p>
          {/* The header already has the «Idioma» landmark: here it is a plain group. */}
          <LocaleSwitch locale={locale} landmark={false} className="self-start" />
        </div>
      </div>
      <div className="border-t border-app">
        <p className="mx-auto max-w-[1200px] px-4 py-5 text-caption text-muted sm:px-6">{t.footer.rights}</p>
      </div>
    </footer>
  );
}
