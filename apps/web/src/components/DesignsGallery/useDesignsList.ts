"use client";

import { useCallback, useEffect, useState } from "react";
import { designsApi, type DesignSummary } from "@/lib/designs/client";

export type ListStatus = "idle" | "loading" | "ready" | "error";

/**
 * The signed-in user's designs for a search and sort. Refetches when they change (the search is debounced
 * by the caller) and when `userId` changes. `update` edits the local list after a rename/duplicate/delete.
 */
export function useDesignsList(userId: string | null, query: string, sort: "recent" | "name") {
  const [status, setStatus] = useState<ListStatus>("idle");
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [max, setMax] = useState(0);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    // A fetch keyed on its inputs: its result lands in state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus((current) => (current === "ready" ? current : "loading"));
    designsApi
      .list({ query, sort, signal: controller.signal })
      .then((result) => {
        setDesigns(result.designs);
        setMax(result.max);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [userId, query, sort, version]);

  const reload = useCallback(() => {
    setStatus("loading");
    setVersion((value) => value + 1);
  }, []);

  return { status: userId ? status : "idle", designs, max, update: setDesigns, reload };
}
