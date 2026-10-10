import type { Metadata } from "next";
import { Suspense } from "react";
import { AppBackground } from "@/components/AppBackground";
import { LoginScreen } from "@/components/LoginScreen";
import { authText } from "@/i18n/auth";
import { defaultLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: `${authText[defaultLocale].account.signIn} · Dialmade`,
  robots: { index: false },
};

/** Minimal centered sign-in (ref. 9D Devin). From anywhere else the same form opens as a modal. */
export default function LoginPage() {
  return (
    <>
      <AppBackground />
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-[12vh] pb-10 sm:items-center sm:pt-0">
        <Suspense>
          <LoginScreen />
        </Suspense>
      </main>
    </>
  );
}
