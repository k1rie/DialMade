"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { useDesignDocActions, useDesignDocStore } from "@/hooks/useDesignDoc";
import { usePaletteFlow } from "@/hooks/usePaletteFlow";
import { useDictionary } from "@/i18n";
import { authText } from "@/i18n/auth";
import { designsApi, DesignsApiError } from "@/lib/designs/client";
import { markSaved, saveDesign, setCurrentDoc } from "@/lib/designs/currentDesign";
import { RESUME_PARAM, RESUME_SAVE, clearPendingSave, readPendingSave } from "@/lib/designs/pendingSave";

export const DESIGN_PARAM = "design";

/** Removes `?design=` / `?resume=` so a reload does not open or save again. */
function cleanUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete(DESIGN_PARAM);
  url.searchParams.delete(RESUME_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

/**
 * «Mis diseños» inside the flow:
 * - mirrors the flow's DesignDoc for «Guardar» in the AppHeader (`currentDesign`);
 * - `/?design=<id>` opens a saved design in «Ajustar»;
 * - `/?resume=save` (back from a sign-in started by «Guardar») reopens the waiting design and saves it.
 */
export function useSavedDesign() {
  const store = useDesignDocStore();
  const actions = useDesignDocActions();
  const { actions: flow } = usePaletteFlow();
  const { openLogin } = useAuth();
  const t = useDictionary(authText).save;
  const latest = useRef({ t, openLogin });
  const started = useRef(false);
  useEffect(() => {
    latest.current = { t, openLogin };
  });

  useEffect(() => {
    setCurrentDoc(store.getState().doc);
    const unsubscribe = store.subscribe((state) => setCurrentDoc(state.doc));
    return () => {
      unsubscribe();
      setCurrentDoc(null);
    };
  }, [store]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get(DESIGN_PARAM);
    const resume = params.get(RESUME_PARAM) === RESUME_SAVE;
    // Once per page load (StrictMode runs effects twice; the URL is cleaned on the first run).
    if (started.current || (!id && !resume)) return;
    started.current = true;
    cleanUrl();

    const load = async () => {
      let stored: unknown;
      let savedId: string | null;
      if (id) {
        const design = await designsApi.get(id);
        stored = design.doc;
        savedId = design.id;
      } else {
        const pending = readPendingSave();
        if (!pending) return;
        stored = pending.doc;
        savedId = pending.savedId;
      }
      await actions.loadEngine();
      const { parseDesignDoc } = await import("@dialmade/doc");
      const doc = parseDesignDoc(stored);
      actions.open(doc);
      const { primary, secondary } = doc.brand.seeds;
      flow.openDesign({ primary, ...(secondary && { secondary }), styleId: doc.brief.paletteStyleId });
      const text = latest.current.t;
      if (id && savedId) {
        markSaved(savedId, doc);
        toast(text.opened(doc.brand.name));
        return;
      }
      const outcome = await saveDesign(doc, savedId);
      if (outcome?.ok) {
        clearPendingSave();
        toast.success(text.resumed);
      } else if (outcome && outcome.error.status !== 401) {
        toast.error(outcome.error.code === "limit" ? text.limit(outcome.error.max ?? 0) : text.failed);
      }
    };

    load().catch((error: unknown) => {
      const { t: text, openLogin } = latest.current;
      // Signed out (or another browser): sign in and come back to the same design.
      if (id && error instanceof DesignsApiError && error.status === 401) openLogin({ reason: "designs", callbackPath: `/?${DESIGN_PARAM}=${encodeURIComponent(id)}` });
      else toast.error(text.openFailed);
    });
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
