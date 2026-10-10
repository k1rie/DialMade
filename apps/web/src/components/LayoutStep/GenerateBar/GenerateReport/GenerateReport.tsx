"use client";

import type { ScreenId } from "@dialmade/layout";
import { useCallback, useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { Toaster } from "sonner";
import { cn } from "@/lib/cn";
import { useLayoutStore } from "../../useLayoutStore";
import { OPEN_ANNOUNCE_DELAY_MS, REPORT_TOASTER_ID, REPORT_TOASTER_STYLE } from "./constants";
import { nextLiveMessage } from "./report";
import { ReportBody } from "./ReportBody";

export type GenerateReportProps = {
  open: boolean;
  /** Esc, the backdrop and the close button call it with `false`. */
  onOpenChange: (open: boolean) => void;
  /** Screen shown first (the active screen). */
  initialScreenId: ScreenId | null;
  /** Said once the dialog is open («Diseño generado: …»); the page's live region is inert behind it. */
  openAnnouncement?: string | null;
};

/** A click on the ::backdrop targets the dialog itself, outside its box (not on its scrollbar). */
function isBackdropClick(event: MouseEvent<HTMLDialogElement>): boolean {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  return x < box.left || x > box.right || y < box.top || y > box.bottom;
}

/**
 * «Resultado» of the last Generar: one tab per screen and, per screen, Wireframe (ASCII), CSS and JSON
 * (each with «Copiar») and Avisos with their fixes. A native modal <dialog>: the page behind is inert
 * (focus stays inside), Esc and the backdrop close it and focus returns to the opener. A fix applied
 * here runs Generar again, so every tab shows the corrected result.
 *
 * The modal makes everything outside it inert and hidden from assistive tech, the page's live region
 * (DndAnnouncer) included. So the report has its own polite live region inside the dialog: the opening
 * message and the fixes are said there.
 */
export function GenerateReport({ open, onOpenChange, initialScreenId, openAnnouncement = null }: GenerateReportProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);
  const generated = useLayoutStore((state) => state.generated);
  const [liveMessage, setLiveMessage] = useState("");
  const say = useCallback((text: string) => setLiveMessage((previous) => nextLiveMessage(previous, text)), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      initialFocusRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // After showModal (the effect above runs first): the region is visible, the message is a change.
  useEffect(() => {
    if (!open || !openAnnouncement) return;
    const timer = setTimeout(() => say(openAnnouncement), OPEN_ANNOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open, openAnnouncement, say]);

  const onClose = () => {
    // Empty, so the next opening's message is a change even when it is the same text.
    setLiveMessage("");
    onOpenChange(false);
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onClick={(event) => {
        if (isBackdropClick(event)) onOpenChange(false);
      }}
      className={cn(
        "pointer-events-auto m-auto max-h-[calc(100dvh-2rem)] w-[min(100vw-2rem,52rem)] overflow-y-auto overscroll-contain",
        "rounded-panel border border-app-strong bg-app-elevated p-0 text-body text-fg shadow-lift scrollbar-none",
        "backdrop:bg-black/60 backdrop:backdrop-blur-sm",
      )}
    >
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </p>
      {open && generated && (
        <ReportBody
          result={generated}
          announce={say}
          initialScreenId={initialScreenId}
          titleId={titleId}
          descriptionId={descriptionId}
          dialogRef={dialogRef}
          initialFocusRef={initialFocusRef}
          onClose={() => onOpenChange(false)}
        />
      )}
      <Toaster
        id={REPORT_TOASTER_ID}
        theme="dark"
        position="bottom-center"
        gap={10}
        offset={24}
        style={REPORT_TOASTER_STYLE}
        toastOptions={{ className: "!shadow-surface !text-small", classNames: { description: "!text-muted" } }}
      />
    </dialog>
  );
}
