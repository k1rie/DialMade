"use client";

import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId } from "react";
import { AuthForm, loginErrorFromQuery } from "@/components/AuthForm";
import { useAuth } from "@/components/AuthProvider";
import { DialMark } from "@/components/DialMark";
import { useDictionary } from "@/i18n";
import { authText } from "@/i18n/auth";
import { safeCallbackPath } from "@/lib/auth/callback";
import { stageVariants } from "@/lib/motion";

/** /login: logo, «Bienvenido», providers, separator, email and magic link. `?next=` is where it goes after. */
export function LoginScreen() {
  const t = useDictionary(authText).login;
  const router = useRouter();
  const params = useSearchParams();
  const { availability, user } = useAuth();
  const titleId = useId();
  const next = safeCallbackPath(params.get("next"));
  const error = loginErrorFromQuery(t, params.get("error"));

  // Already signed in with an account: nothing to do here.
  const signedIn = !!user && !user.isAnonymous;
  useEffect(() => {
    if (signedIn) router.replace(next);
  }, [signedIn, next, router]);

  return (
    <motion.section
      aria-labelledby={titleId}
      variants={stageVariants}
      initial="initial"
      animate="animate"
      className="w-full max-w-[22.5rem]"
    >
      <AuthForm
        availability={availability}
        callbackPath={next}
        initialError={error}
        onSignedIn={() => router.replace(next)}
        onContinueWithout={() => router.push("/")}
        header={
          <div className="flex flex-col items-center gap-4 pb-2 text-center">
            <DialMark className="size-11" />
            <div>
              <h1 id={titleId} className="m-0 text-h2">
                {t.title}
              </h1>
              <p className="m-0 mt-2 text-small text-muted">{t.subtitle}</p>
            </div>
          </div>
        }
      />
    </motion.section>
  );
}
