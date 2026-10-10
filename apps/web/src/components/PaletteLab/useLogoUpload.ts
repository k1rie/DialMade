"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { LOGO_ACCEPT, LogoFileError, MAX_LOGO_MB, readLogoFile, type FlowLogo } from "@/lib/image";

/**
 * «Cambiar logo» / «Subir logo» from the lab: a hidden file input; a valid file is read and handed to
 * `onLogo` (which starts the crop step), errors show as toasts.
 */
export function useLogoUpload(onLogo: (logo: FlowLogo) => void) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const open = useCallback(() => inputRef.current?.click(), []);

  const onChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setReading(true);
      try {
        onLogo(await readLogoFile(file));
      } catch (error) {
        if (error instanceof LogoFileError) {
          toast.error(
            error.code === "unsupported-type" ? t.errors.unsupportedType : error.code === "too-large" ? t.errors.tooLarge(MAX_LOGO_MB) : t.errors.decodeFailed,
          );
        } else {
          toast.error(t.errors.generic);
        }
      } finally {
        setReading(false);
      }
    },
    [onLogo, t],
  );

  return { open, reading, inputProps: { ref: inputRef, type: "file" as const, accept: LOGO_ACCEPT, hidden: true, tabIndex: -1, onChange } };
}
