import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { Providers } from "@/components/Providers";
import { common } from "@/i18n/common";
import { LOCALE_STORAGE_KEY, defaultLocale } from "@/i18n/config";
import "./globals.css";

// Inter only renders outside Apple platforms (SF comes first in --font-sans), so it is not preloaded.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap", preload: false });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap", preload: false });

const t = common[defaultLocale];

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
};

export const viewport: Viewport = {
  themeColor: "#0b0a10",
  colorScheme: "dark",
};

// Runs before first paint: platform flag (Inter features only off-Apple) and the stored locale.
const bootScript = `(function(){try{var d=document.documentElement,n=navigator,p=(n.userAgentData&&n.userAgentData.platform)||n.platform||n.userAgent;d.dataset.platform=/Mac|iPhone|iPad|iPod|iOS/i.test(p)?"apple":"other";var l=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)});if(l==="es"||l==="en")d.lang=l}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={defaultLocale} className={`dark ${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <AppHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
