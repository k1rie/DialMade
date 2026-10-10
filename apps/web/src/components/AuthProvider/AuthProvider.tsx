"use client";

// Session and login for the whole app. The app works without an account: with accounts off
// (`availability.enabled === false`) nothing is fetched and «Entrar» explains it. `openLogin` shows the
// login as a modal over the current view (MagicPath); /login is the same form as a page (Devin).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useDictionary } from "@/i18n";
import { authText } from "@/i18n/auth";
import { AUTH_OFF, type AuthAvailability } from "@/lib/auth/availability";
import { authClient } from "@/lib/auth/client";
import { LoginDialog, type LoginRequest } from "./LoginDialog";

export type AuthUser = { id: string; name: string; email: string; image: string | null; isAnonymous: boolean };

export type AuthContextValue = {
  availability: AuthAvailability;
  /** `null` signed out (or while loading: see `loading`). Anonymous devices are users with `isAnonymous`. */
  user: AuthUser | null;
  loading: boolean;
  openLogin: (request?: LoginRequest) => void;
  refresh: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toUser(session: unknown): AuthUser | null {
  const user = (session as { user?: Record<string, unknown> } | null)?.user;
  if (!user || typeof user.id !== "string") return null;
  return {
    id: user.id,
    name: typeof user.name === "string" ? user.name : "",
    email: typeof user.email === "string" ? user.email : "",
    image: typeof user.image === "string" && /^https:\/\//.test(user.image) ? user.image : null,
    isAnonymous: user.isAnonymous === true,
  };
}

export function AuthProvider({ availability = AUTH_OFF, children }: { availability?: AuthAvailability; children: ReactNode }) {
  const text = useDictionary(authText);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(availability.enabled);
  const [login, setLogin] = useState<LoginRequest | null>(null);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!availability.enabled) return null;
    const ticket = ++generation.current;
    const { data } = await authClient.getSession({ fetchOptions: { cache: "no-store" } }).catch(() => ({ data: null }));
    const next = toUser(data);
    if (ticket === generation.current) {
      setUser(next);
      setLoading(false);
    }
    return next;
  }, [availability.enabled]);

  useEffect(() => {
    if (!availability.enabled) return;
    // Initial session read: an async fetch whose result lands in state.
    void refresh();
    // A sign-in in another tab (the magic link) shows up when this one is looked at again.
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [availability.enabled, refresh]);

  const signOut = useCallback(async () => {
    await authClient.signOut().catch(() => {});
    generation.current += 1;
    setUser(null);
    toast(text.account.signedOut);
  }, [text]);

  const openLogin = useCallback((request: LoginRequest = {}) => setLogin(request), []);

  const value = useMemo<AuthContextValue>(
    () => ({ availability, user, loading, openLogin, refresh, signOut }),
    [availability, user, loading, openLogin, refresh, signOut],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginDialog
        request={login}
        availability={availability}
        onClose={() => setLogin(null)}
        onSignedIn={async () => {
          const request = login;
          setLogin(null);
          const signedIn = await refresh();
          if (signedIn) request?.onSignedIn?.();
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
