"use client";

// The sign-in form of /login (Devin, minimal) and of the login modal (MagicPath): GitHub and Google, a
// separator, email + «Enviar magic link», passkey and, when asked, «Guardar en este dispositivo sin cuenta».
// Providers without credentials show «No configurado». No brand logos (CLAUDE.md): text buttons only.
import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useIsClient } from "@/hooks/useIsClient";
import { useDictionary, useI18n } from "@/i18n";
import { authText } from "@/i18n/auth";
import type { AuthAvailability } from "@/lib/auth/availability";
import { safeCallbackPath } from "@/lib/auth/callback";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { authErrorMessage, isValidEmail, supportsPasskeys } from "./authErrors";

export type AuthFormProps = {
  availability: AuthAvailability;
  /** Where the user lands after a redirecting sign-in (OAuth, magic link). Sanitized here too. */
  callbackPath: string;
  /** Called before leaving the page (OAuth) or sending the link: e.g. keep the design to save it on return. */
  onBeforeRedirect?: () => void;
  /** A sign-in that did not leave the page (passkey, anonymous) finished. */
  onSignedIn?: (method: "passkey" | "anonymous") => void;
  /** Offer «Guardar en este dispositivo sin cuenta». */
  showAnonymous?: boolean;
  /** «Seguir sin cuenta» (closes the modal / goes home). */
  onContinueWithout?: () => void;
  /** Error to show on arrival (e.g. an expired link, `/login?error=`). */
  initialError?: string | null;
  /** Heading level and id come from the caller (page h1, dialog title). */
  header: ReactNode;
  className?: string;
};

type Busy = null | "github" | "google" | "email" | "passkey" | "anonymous";

const providerName = { github: "GitHub", google: "Google" } as const;

export function AuthForm({
  availability,
  callbackPath,
  onBeforeRedirect,
  onSignedIn,
  showAnonymous = false,
  onContinueWithout,
  initialError = null,
  header,
  className,
}: AuthFormProps) {
  const t = useDictionary(authText).login;
  const { locale } = useI18n();
  const emailId = useId();
  const errorId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Passkey support is only known in the browser: the button appears after hydration.
  const isClient = useIsClient();
  const callbackURL = safeCallbackPath(callbackPath);
  const errorCallbackURL = "/login?error=link";

  if (!availability.enabled) {
    return (
      <div className={cn("flex flex-col gap-5", className)}>
        {header}
        <p className="m-0 text-small text-muted" role="status">
          {t.authOff}
        </p>
        {onContinueWithout && (
          <Button variant="primary" size="lg" onClick={onContinueWithout}>
            {t.continueWithout}
          </Button>
        )}
      </div>
    );
  }

  const fail = (status: number | undefined, code?: string) => {
    setBusy(null);
    setError(authErrorMessage(t, status, code));
  };

  const social = async (provider: "github" | "google") => {
    setError(null);
    setBusy(provider);
    onBeforeRedirect?.();
    const { error: failure } = await authClient.signIn.social({ provider, callbackURL, errorCallbackURL });
    // On success the browser is already leaving for the provider.
    if (failure) fail(failure.status, failure.code);
  };

  const sendLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = emailRef.current?.value.trim() ?? "";
    if (!isValidEmail(email)) {
      setError(t.errors.invalidEmail);
      emailRef.current?.focus();
      return;
    }
    setError(null);
    setBusy("email");
    onBeforeRedirect?.();
    const { error: failure } = await authClient.signIn.magicLink({ email, callbackURL, errorCallbackURL, metadata: { locale } });
    if (failure) return fail(failure.status, failure.code);
    setBusy(null);
    setSentTo(email);
  };

  const passkey = async () => {
    setError(null);
    setBusy("passkey");
    const result = await authClient.signIn.passkey();
    if (result?.error) return fail(result.error.status, "code" in result.error ? result.error.code : "PASSKEY");
    setBusy(null);
    onSignedIn?.("passkey");
  };

  const anonymous = async () => {
    setError(null);
    setBusy("anonymous");
    const { error: failure } = await authClient.signIn.anonymous();
    if (failure) return fail(failure.status, failure.code);
    setBusy(null);
    onSignedIn?.("anonymous");
  };

  const providerButton = (provider: "github" | "google") => {
    const configured = availability[provider];
    return (
      <Button
        key={provider}
        size="lg"
        className="w-full justify-between"
        disabled={!configured || busy !== null}
        loading={busy === provider}
        onClick={() => void social(provider)}
        aria-describedby={configured ? undefined : `${errorId}-${provider}`}
        trailingIcon={
          configured ? undefined : (
            <span id={`${errorId}-${provider}`} className="rounded-chip border border-app px-1.5 py-0.5 text-caption text-subtle">
              <span className="sr-only">{t.notConfiguredHint(providerName[provider])} </span>
              <span aria-hidden>{t.notConfigured}</span>
            </span>
          )
        }
      >
        {t[provider]}
      </Button>
    );
  };

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {header}
      <AnimatePresence mode="wait" initial={false}>
        {sentTo ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={tween(0.24)}
            className="flex flex-col gap-4"
            role="status"
          >
            <div className="rounded-card border border-app bg-white/[0.03] p-4">
              <p className="m-0 text-body font-semibold text-fg">{t.sentTitle}</p>
              <p className="m-0 mt-1 text-small text-muted">{t.sentBody(sentTo)}</p>
              {availability.devEmail && <p className="m-0 mt-3 font-mono text-caption text-warning">{t.sentDev}</p>}
            </div>
            <Button variant="ghost" className="self-start" onClick={() => setSentTo(null)}>
              {t.useOtherEmail}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={tween(0.24)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {providerButton("github")}
              {providerButton("google")}
            </div>

            <div className="flex items-center gap-3 text-caption text-subtle" aria-hidden>
              <span className="h-px flex-1 bg-white/10" />
              {t.or}
              <span className="h-px flex-1 bg-white/10" />
            </div>

            {availability.magicLink ? (
              <form onSubmit={sendLink} noValidate className="flex flex-col gap-2">
                <label htmlFor={emailId} className="text-small font-medium text-fg">
                  {t.emailLabel}
                </label>
                <input
                  ref={emailRef}
                  id={emailId}
                  type="email"
                  name="email"
                  inputMode="email"
                  autoComplete="email webauthn"
                  autoCapitalize="off"
                  spellCheck={false}
                  required
                  placeholder={t.emailPlaceholder}
                  aria-invalid={error === t.errors.invalidEmail || undefined}
                  aria-describedby={error ? errorId : undefined}
                  onInput={() => error === t.errors.invalidEmail && setError(null)}
                  className="h-11 rounded-control border border-app-strong bg-app px-3 text-body text-fg placeholder:text-subtle focus-visible:border-accent aria-[invalid=true]:border-danger"
                />
                <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy === "email"} disabled={busy !== null && busy !== "email"}>
                  {t.sendLink}
                </Button>
              </form>
            ) : (
              <p className="m-0 flex items-center justify-between rounded-control border border-app px-3 py-2.5 text-small text-muted">
                {t.sendLink}
                <span className="rounded-chip border border-app px-1.5 py-0.5 text-caption text-subtle">{t.notConfigured}</span>
              </p>
            )}

            {availability.passkey && isClient && supportsPasskeys() && (
              <Button variant="ghost" className="w-full" loading={busy === "passkey"} disabled={busy !== null && busy !== "passkey"} onClick={() => void passkey()}>
                {t.passkey}
              </Button>
            )}

            {showAnonymous && availability.anonymous && (
              <div className="flex flex-col gap-1 border-t border-app pt-4">
                <Button variant="secondary" className="w-full" loading={busy === "anonymous"} disabled={busy !== null && busy !== "anonymous"} onClick={() => void anonymous()}>
                  {t.anonymous}
                </Button>
                <p className="m-0 text-caption text-muted">{t.anonymousHint}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p id={errorId} role="alert" className={cn("m-0 min-h-4 text-small", error ? "text-danger" : "sr-only")}>
        {error}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-subtle">
        <span>{t.noPasswords}</span>
        {onContinueWithout && (
          <button type="button" onClick={onContinueWithout} className="rounded-chip text-caption text-muted underline-offset-4 hover:text-fg hover:underline focus-visible:underline">
            {t.continueWithout}
          </button>
        )}
      </div>
    </div>
  );
}
