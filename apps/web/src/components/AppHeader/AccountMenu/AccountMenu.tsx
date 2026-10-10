"use client";

// Account in the header: «Entrar» when signed out; otherwise an avatar that opens a menu with
// «Mis diseños», «Añadir passkey» and «Cerrar sesión». An anonymous device sees «Entrar o crear cuenta».
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth, type AuthUser } from "@/components/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
import { useDictionary } from "@/i18n";
import { authText } from "@/i18n/auth";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/cn";

const itemClass =
  "flex h-9 w-full items-center gap-2 rounded-chip px-2.5 text-left text-small text-fg transition-colors duration-150 hover:bg-white/[0.06] focus-visible:bg-white/[0.06]";

function initialOf(user: AuthUser) {
  const source = user.isAnonymous ? "" : user.name || user.email;
  return source.trim().charAt(0).toUpperCase() || "·";
}

function Avatar({ user, className }: { user: AuthUser; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-7 items-center justify-center overflow-hidden rounded-full border border-app-strong bg-surface-hover text-caption font-semibold text-fg", className)}>
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatars from GitHub/Google, any host
        <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        initialOf(user)
      )}
    </span>
  );
}

export function AccountMenu() {
  const t = useDictionary(authText).account;
  const { availability, user, loading, openLogin, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!availability.enabled || loading) return null;

  if (!user) {
    return (
      <Button size="sm" variant="ghost" onClick={() => openLogin({ reason: "generic" })}>
        {t.signIn}
      </Button>
    );
  }

  const addPasskey = async () => {
    setOpen(false);
    const result = await authClient.passkey.addPasskey();
    if (result?.error) toast.error(t.passkeyFailed);
    else toast.success(t.passkeyAdded);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label={t.menuLabel}
      align="end"
      className="w-64 p-1.5"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={t.menuLabel}
          className="inline-flex items-center rounded-full outline-offset-2 transition-transform duration-150 hover:scale-[1.04]"
        >
          <Avatar user={user} />
        </button>
      )}
    >
      <div className="flex items-center gap-2.5 px-2.5 pt-1.5 pb-2.5">
        <Avatar user={user} className="size-8" />
        <div className="min-w-0">
          {user.isAnonymous ? (
            <>
              <p className="m-0 truncate text-small font-medium text-fg">{t.guest}</p>
              <p className="m-0 truncate text-caption text-muted">{t.guestHint}</p>
            </>
          ) : (
            <>
              <p className="m-0 truncate text-small font-medium text-fg">{user.name || user.email}</p>
              {user.name && <p className="m-0 truncate text-caption text-muted">{user.email}</p>}
            </>
          )}
        </div>
      </div>
      <div className="h-px bg-white/[0.08]" />
      <nav aria-label={t.menuLabel} className="flex flex-col py-1">
        <Link href="/designs" className={itemClass} onClick={() => setOpen(false)}>
          {t.myDesigns}
        </Link>
        {user.isAnonymous ? (
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              openLogin({ reason: "generic" });
            }}
          >
            {t.createAccount}
          </button>
        ) : (
          availability.passkey && (
            <button type="button" className={itemClass} onClick={() => void addPasskey()}>
              {t.addPasskey}
            </button>
          )
        )}
      </nav>
      {!user.isAnonymous && (
        <>
          <div className="h-px bg-white/[0.08]" />
          <div className="py-1">
            <button
              type="button"
              className={cn(itemClass, "text-muted hover:text-fg")}
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
            >
              {t.signOut}
            </button>
          </div>
        </>
      )}
    </Popover>
  );
}
