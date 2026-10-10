"use client";

import Link from "next/link";
import { useDictionary } from "@/i18n";
import { authText } from "@/i18n/auth";
import { PlusIcon } from "../icons";

/** «Nuevo diseño»: the first card of «Recientes», back to the start of the flow. */
export function NewDesignCard() {
  const t = useDictionary(authText).designs;
  return (
    <li className="relative flex">
      <Link
        href="/"
        className="group flex min-h-full w-full flex-col items-center justify-center gap-3 rounded-card border border-dashed border-app-strong bg-white/[0.02] p-6 text-center transition-[background-color,border-color] duration-150 hover:border-accent hover:bg-accent-soft"
      >
        <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-full border border-app-strong bg-surface text-fg transition-transform duration-200 ease-out group-hover:scale-105 [&_svg]:size-5">
          <PlusIcon />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-small font-medium text-fg">{t.newDesign}</span>
          <span className="text-caption text-muted">{t.newDesignHint}</span>
        </span>
      </Link>
    </li>
  );
}
