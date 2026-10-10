"use client";

// «Guardar» in the header, while the flow has a design. Without an account it opens the login modal; the
// design waits in this browser (pendingSave) while OAuth or the magic link take the user away, and is saved
// on return. ⌘S / Ctrl+S saves too.
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useStore } from "zustand";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { authText } from "@/i18n/auth";
import { currentDesign, isSaved, saveDesign, savedIdFor, type SaveOutcome } from "@/lib/designs/currentDesign";
import { RESUME_SAVE_PATH, stashPendingSave } from "@/lib/designs/pendingSave";
import { tween } from "@/lib/motion";

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
    <path d="m3.5 8.5 3 3 6-7" />
  </svg>
);

const SaveIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
    <path d="M8 2.5v7M5 6.5l3 3 3-3M3 11.5v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
  </svg>
);

export function SaveButton() {
  const t = useDictionary(authText).save;
  const router = useRouter();
  const { availability, user, loading, openLogin } = useAuth();
  const doc = useStore(currentDesign, (state) => state.doc);
  const saving = useStore(currentDesign, (state) => state.saving);
  const saved = useStore(currentDesign, isSaved);

  const report = useCallback(
    (outcome: SaveOutcome | null, retryWithLogin: () => void) => {
      if (!outcome) return;
      if (outcome.ok) {
        toast.success(t.savedToast, { action: { label: t.open, onClick: () => router.push("/designs") } });
        return;
      }
      const { error } = outcome;
      if (error.status === 401) retryWithLogin();
      else if (error.code === "limit") toast.error(t.limit(error.max ?? 0));
      else if (error.code === "too-large") toast.error(t.tooLarge);
      else if (error.code === "quota") toast.error(t.quota);
      else if (error.code === "rate-limited") toast.error(t.rateLimited);
      else toast.error(t.failed);
    },
    [t, router],
  );

  const askToSignIn = useCallback(() => {
    const current = currentDesign.getState().doc;
    if (!current) return;
    openLogin({
      reason: "save",
      callbackPath: RESUME_SAVE_PATH,
      allowAnonymous: true,
      onBeforeRedirect: () => void stashPendingSave(current, savedIdFor(current)),
      onSignedIn: () => void saveDesign().then((outcome) => report(outcome, () => toast.error(t.failed))),
    });
  }, [openLogin, report, t]);

  const save = useCallback(async () => {
    if (!user) return askToSignIn();
    report(await saveDesign(), askToSignIn);
  }, [user, askToSignIn, report]);

  const visible = availability.enabled && doc !== null;

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "s" || !(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (!loading && !currentDesign.getState().saving) void save();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, loading, save]);

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div key="save" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={tween(0.18)}>
          <Button
            size="sm"
            variant={saved ? "ghost" : "secondary"}
            loading={saving}
            disabled={loading}
            leadingIcon={saved ? <CheckIcon /> : <SaveIcon />}
            onClick={() => void save()}
            aria-keyshortcuts="Meta+S Control+S"
          >
            {saving ? t.saving : saved ? t.saved : t.save}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
