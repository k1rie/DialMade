import { notFound } from "next/navigation";
import { Features } from "@/components/Features";
import { FinalCta } from "@/components/FinalCta";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { LayoutSection } from "@/components/LayoutSection";
import { OpenSource } from "@/components/OpenSource";
import { SiteBackground } from "@/components/SiteBackground";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { common, isLocale } from "@/i18n";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-control bg-app-elevated px-3 py-2 text-small text-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {common[lang].app.skipToContent}
      </a>
      <SiteBackground />
      <SiteNav locale={lang} />
      <main id="contenido">
        <Hero locale={lang} />
        <LayoutSection locale={lang} />
        <HowItWorks locale={lang} />
        <Features locale={lang} />
        <OpenSource locale={lang} />
        <FinalCta locale={lang} />
      </main>
      <SiteFooter locale={lang} />
    </>
  );
}
