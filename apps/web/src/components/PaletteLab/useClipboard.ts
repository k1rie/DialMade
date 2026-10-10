"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useDictionary } from "@/i18n";
import { palette } from "@/i18n/palette";

/** Copies text and confirms with a toast (`success` is already localized); a denied clipboard shows an error toast. */
export function useClipboard() {
  const t = useDictionary(palette).export;
  return useCallback(
    async (text: string, success: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(success);
        return true;
      } catch {
        toast.error(t.copyFailed);
        return false;
      }
    },
    [t],
  );
}

/** Saves `text` as a file through a temporary blob link. */
export function downloadText(fileName: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
