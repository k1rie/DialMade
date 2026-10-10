"use client";

// The login as a modal over the current view, which blurs behind it (ref. 9A MagicPath). Same form as /login.
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, type MouseEvent } from "react";
import { AuthForm } from "@/components/AuthForm";
import { DialMark } from "@/components/DialMark";
import { IconButton } from "@/components/ui/IconButton";
import { useDictionary, useI18n } from "@/i18n";
import { authText } from "@/i18n/auth";
import type { AuthAvailability } from "@/lib/auth/availability";
import { smooth, tween } from "@/lib/motion";

export type LoginRequest = {
  /** Why it opened: the title says it. */
  reason?: "save" | "designs" | "generic";
  /** Where OAuth and the magic link come back to. Default: the current path. */
  callbackPath?: string;
  /** Before leaving the page (OAuth) or sending the link. */
  onBeforeRedirect?: () => void;
  /** After a sign-in that stayed on the page (passkey, anonymous). */
  onSignedIn?: () => void;
  /** Offer «Guardar en este dispositivo sin cuenta». */
  allowAnonymous?: boolean;
};

export type LoginDialogProps = {
  request: LoginRequest | null;
  availability: AuthAvailability;
  onClose: () => void;
  onSignedIn: () => void;
};

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden focusable="false">
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
);

function isBackdropClick(event: MouseEvent<HTMLDialogElement>): boolean {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
}

export function LoginDialog({ request, availability, onClose, onSignedIn }: LoginDialogProps) {
  const t = useDictionary(authText).login;
  const { t: common } = useI18n();
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = request !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const reason = request?.reason ?? "generic";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (isBackdropClick(event)) onClose();
      }}
      className="app-chrome m-auto max-h-[calc(100dvh-2rem)] w-[min(100vw-2rem,25rem)] overflow-y-auto rounded-panel border border-app-strong bg-app-elevated p-0 text-fg shadow-lift backdrop:bg-black/55 backdrop:backdrop-blur-md"
    >
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...smooth, opacity: tween(0.2) }}
          className="relative p-6"
        >
          <IconButton label={common.actions.close} icon={<CloseIcon />} tooltip={false} className="absolute top-3 right-3" onClick={onClose} />
          <AuthForm
            availability={availability}
            callbackPath={request.callbackPath ?? pathname ?? "/"}
            onBeforeRedirect={request.onBeforeRedirect}
            onSignedIn={onSignedIn}
            showAnonymous={request.allowAnonymous}
            onContinueWithout={onClose}
            header={
              <div className="flex flex-col items-center gap-3 pt-2 text-center">
                <DialMark className="size-9" />
                <div>
                  <h2 id={titleId} className="m-0 text-h3">
                    {t.reasons[reason]}
                  </h2>
                  <p className="m-0 mt-1 text-small text-muted">{reason === "save" && request.onBeforeRedirect ? t.resumeHint : t.subtitle}</p>
                </div>
              </div>
            }
          />
        </motion.div>
      )}
    </dialog>
  );
}
