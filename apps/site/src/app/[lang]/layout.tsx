import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { MotionProvider } from "@/components/MotionProvider";
import { common, isLocale, locales } from "@/i18n";
import { SITE_URL } from "@/lib/links";
import "../globals.css";

// Inter only renders outside Apple platforms (SF comes first in --font-sans), so it is not preloaded.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap", preload: false });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap", preload: false });

export const generateStaticParams = () => locales.map((lang) => ({ lang }));

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = common[lang];
  return {
    metadataBase: new URL(SITE_URL),
    title: t.meta.title,
    description: t.meta.description,
    // `/` negotiates the language (proxy.ts), so it is the x-default.
    alternates: {
      canonical: `/${lang}`,
      languages: { ...Object.fromEntries(locales.map((l) => [l, `/${l}`])), "x-default": "/" },
    },
    openGraph: {
      type: "website",
      siteName: t.app.name,
      url: `/${lang}`,
      title: t.meta.title,
      description: t.meta.description,
      locale: lang === "es" ? "es_ES" : "en_US",
      alternateLocale: lang === "es" ? "en_US" : "es_ES",
    },
    twitter: { card: "summary", title: t.meta.title, description: t.meta.description },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0a10",
  colorScheme: "dark",
};

// Runs before first paint: Inter features only off-Apple (DESIGN-BRIEF §3).
const bootScript = `(function(){try{var d=document.documentElement,n=navigator,p=(n.userAgentData&&n.userAgentData.platform)||n.platform||n.userAgent;d.dataset.platform=/Mac|iPhone|iPad|iPod|iOS/i.test(p)?"apple":"other"}catch(e){}})()`;

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang} className={`dark ${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
