"use client";

import { useEffect } from "react";
import { useDictionary } from "@/i18n";
import { promo } from "@/i18n/promo";
import { ERROR_ATTRIBUTE } from "../usePromoReady";

/** Why the scene cannot render; also set on `<html>` (`data-promo-error`) so the capture fails with it. */
export function PromoError({ message }: { message: string }) {
  const t = useDictionary(promo);
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute(ERROR_ATTRIBUTE, message);
    return () => html.removeAttribute(ERROR_ATTRIBUTE);
  }, [message]);
  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-2 px-4 py-16">
      <h1 className="text-h3 text-fg">{t.errors.title}</h1>
      <p role="alert" className="text-body text-danger">
        {message}
      </p>
    </main>
  );
}
