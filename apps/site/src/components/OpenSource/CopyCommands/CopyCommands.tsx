"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Status = "idle" | "copied" | "failed";

export type CopyCommandsProps = {
  text: string;
  /** Strings come from the server section, so the dictionaries stay out of the client bundle. */
  copy: string;
  copied: string;
  copyFailed: string;
};

/**
 * Copies the terminal commands. The result («Copiado» or the failure) shows for 1.6 s and is announced
 * by a status region outside the button, so going back to «Copiar comandos» is not announced.
 */
export function CopyCommands({ text, copy, copied, copyFailed }: CopyCommandsProps) {
  const [result, setResult] = useState<{ id: number; status: Status }>({ id: 0, status: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onCopy = async () => {
    let status: Status = "copied";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      status = "failed";
    }
    setResult((r) => ({ id: r.id + 1, status }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setResult((r) => ({ ...r, status: "idle" })), 1600);
  };

  const label = result.status === "copied" ? copied : result.status === "failed" ? copyFailed : copy;
  return (
    <>
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          "ml-auto rounded-chip border px-2 py-1 font-mono text-caption whitespace-nowrap transition-colors duration-150",
          result.status === "copied" && "border-[oklch(0.75_0.17_155/0.4)] text-success",
          result.status === "failed" && "border-[oklch(0.68_0.2_25/0.4)] text-danger",
          result.status === "idle" && "border-app text-muted hover:border-app-strong hover:text-fg",
        )}
      >
        {label}
      </button>
      <span role="status" className="sr-only">
        {/* Keyed per copy, so copying twice in a row is announced twice. */}
        <span key={result.id}>{result.status === "idle" ? "" : label}</span>
      </span>
    </>
  );
}
