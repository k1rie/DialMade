import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { defaultLocale } from "@/i18n/config";
import { promo } from "@/i18n/promo";

export const metadata: Metadata = {
  title: promo[defaultLocale].meta.title,
  robots: { index: false, follow: false },
};

/**
 * The capture stage is development only. In a production build this is a constant `null`, so the import
 * (and PromoScene's client chunk) is never bundled and the page answers 404.
 */
const loadPromoScene = process.env.NODE_ENV === "production" ? null : () => import("@/components/PromoScene");

async function PromoStage({ load }: { load: NonNullable<typeof loadPromoScene> }) {
  const { PromoScene } = await load();
  return <PromoScene />;
}

/** Capture stage for the promo video (`pnpm promo:capture`, apps/web/promo/). */
export default function PromoPage() {
  if (!loadPromoScene) notFound();
  return (
    <Suspense fallback={null}>
      <PromoStage load={loadPromoScene} />
    </Suspense>
  );
}
