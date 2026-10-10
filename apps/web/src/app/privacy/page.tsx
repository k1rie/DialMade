import type { Metadata } from "next";
import { AppBackground } from "@/components/AppBackground";
import { LegalPage } from "@/components/LegalPage";
import { defaultLocale } from "@/i18n/config";
import { legalText } from "@/i18n/legal";

export const metadata: Metadata = { title: `${legalText[defaultLocale].privacy.title} · Dialmade` };

export default function Page() {
  return (
    <>
      <AppBackground />
      <LegalPage document="privacy" />
    </>
  );
}
