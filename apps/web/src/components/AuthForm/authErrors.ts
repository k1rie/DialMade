import type { AuthText } from "@/i18n/auth";

/** Good enough for the form; the server validates for real. */
export const isValidEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const supportsPasskeys = () => typeof window !== "undefined" && typeof window.PublicKeyCredential === "function";

/** A Better Auth error (status + code) in the user's words. Never echoes the server's message. */
export function authErrorMessage(t: AuthText["login"], status: number | undefined, code?: string): string {
  if (code === "TOO_MANY_EMAILS") return t.errors.quota;
  if (status === 429) return t.errors.rateLimited;
  if (code && /PASSKEY|AUTH_CANCEL|NotAllowed/i.test(code)) return t.errors.passkeyCanceled;
  if (code && /INVALID_EMAIL/i.test(code)) return t.errors.invalidEmail;
  return t.errors.generic;
}

/** `?error=` of /login (Better Auth's errorCallbackURL): the link expired or was used. */
export const loginErrorFromQuery = (t: AuthText["login"], value: string | null): string | null => (value ? t.errors.expired : null);
