"use client";

import Link from "next/link";
import { DialMark } from "@/components/DialMark";
import { useI18n } from "@/i18n";
import { LocaleToggle } from "./LocaleToggle";

export function AppHeader() {
  const { t } = useI18n();
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between px-4 sm:px-6">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:rounded-chip focus:bg-surface focus:px-3 focus:py-1.5 focus:text-small">
        {t.app.skipToContent}
      </a>
      <Link href="/" className="group inline-flex items-center gap-2.5 rounded-control pr-2 text-fg">
        <DialMark className="size-6 transition-transform duration-300 ease-out group-hover:rotate-[24deg]" />
        <span className="text-[0.9375rem] font-semibold tracking-[-0.015em]">{t.app.name}</span>
        <span className="hidden text-small text-muted sm:inline">{t.app.tagline}</span>
      </Link>
      <LocaleToggle />
    </header>
  );
}
