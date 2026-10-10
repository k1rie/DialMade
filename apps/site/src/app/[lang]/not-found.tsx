"use client";

import { useParams } from "next/navigation";
import { SiteBackground } from "@/components/SiteBackground";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { common } from "@/i18n/common";
import { defaultLocale, isLocale } from "@/i18n/config";

/** 404 inside the `[lang]` layout: app styles, `<html lang>` and the dictionary of the URL's language. */
export default function NotFound() {
  const { lang } = useParams<{ lang: string }>();
  const locale = isLocale(lang) ? lang : defaultLocale;
  const t = common[locale];
  return (
    <>
      <SiteBackground />
      <main id="contenido" className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-center justify-center gap-5 px-4 text-center sm:px-6">
        <p className="font-mono text-caption text-accent">404</p>
        <h1 className="text-h1 text-balance text-fg">{t.notFound.title}</h1>
        <p className="text-body text-muted">{t.notFound.body}</p>
        <ButtonLink href={`/${locale}`} size="lg" className="mt-3">
          {t.notFound.back}
        </ButtonLink>
      </main>
    </>
  );
}
