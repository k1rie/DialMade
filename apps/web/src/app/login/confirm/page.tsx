import type { Metadata } from "next";
import { Suspense } from "react";
import { AppBackground } from "@/components/AppBackground";
import { MagicLinkConfirm } from "@/components/MagicLinkConfirm";
import { safeCallbackPath } from "@/lib/auth/callback";
import { readAuthConfig } from "@/lib/auth/config";
import { verifyMagicLinkSignature } from "@/lib/auth/magicLink";
import { authText } from "@/i18n/auth";
import { defaultLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: `${authText[defaultLocale].confirm.title} · Dialmade`,
  robots: { index: false },
  referrer: "no-referrer",
};

const TOKEN = /^[A-Za-z0-9_-]{16,128}$/;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/**
 * A magic link opened from outside the app lands here (`guardAuthRequest`): «Vas a entrar como …» and one button.
 * The email is shown only when its signature verifies, so a forged link cannot claim to be the visitor's own.
 */
async function Confirm({ searchParams }: { searchParams: PageProps<"/login/confirm">["searchParams"] }) {
  const params = await searchParams;
  const token = one(params.token);
  if (!token || !TOKEN.test(token)) return <MagicLinkConfirm href={null} email={null} />;
  const email = one(params.email);
  const signature = one(params.sig);
  const config = readAuthConfig();
  const verifiedEmail = email && signature && config && verifyMagicLinkSignature(config.secret, token, email, signature) ? email : null;
  const verify = new URLSearchParams({ token, confirmed: "1" });
  const callbackURL = one(params.callbackURL);
  const errorCallbackURL = one(params.errorCallbackURL);
  if (callbackURL) verify.set("callbackURL", safeCallbackPath(callbackURL));
  if (errorCallbackURL) verify.set("errorCallbackURL", safeCallbackPath(errorCallbackURL, "/login?error=link"));
  return <MagicLinkConfirm href={`/api/auth/magic-link/verify?${verify}`} email={verifiedEmail} />;
}

export default function ConfirmPage({ searchParams }: PageProps<"/login/confirm">) {
  return (
    <>
      <AppBackground />
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-[14vh] pb-10 sm:items-center sm:pt-0">
        <Suspense>
          <Confirm searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
