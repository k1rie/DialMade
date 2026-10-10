import type { Metadata } from "next";
import { AppBackground } from "@/components/AppBackground";
import { DesignsGallery } from "@/components/DesignsGallery";
import { authText } from "@/i18n/auth";
import { defaultLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: `${authText[defaultLocale].designs.title} · Dialmade`,
  robots: { index: false },
};

/** «Mis diseños». Client-rendered: the list depends on the session cookie, checked by /api/designs. */
export default function DesignsPage() {
  return (
    <>
      <AppBackground />
      <DesignsGallery />
    </>
  );
}
