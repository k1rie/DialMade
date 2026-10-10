"use client";

import type { FileRole } from "@dialmade/import";
import { motion } from "motion/react";
import { useId } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { useDictionary, useI18n } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { smooth, tween } from "@/lib/motion";
import { formatBytes, rolesFor, type ImportEntry } from "../entries";
import { AlertIcon, ChevronDownIcon, ClipboardIcon, CloseIcon, FileIcon, ImageIcon } from "../icons";

export type FileRowProps = {
  entry: ImportEntry;
  /** Why it will not be read (localized). */
  problem?: string;
  /** What the last read said about it (localized). */
  report?: string;
  disabled?: boolean;
  onRole: (role: FileRole) => void;
  onRemove: () => void;
};

/** One file of the batch: name, size and detected format, its editable type, and its own error (never blocking the rest). */
export function FileRow({ entry, problem, report, disabled = false, onRole, onRemove }: FileRowProps) {
  const t = useDictionary(importText);
  const { locale } = useI18n();
  const selectId = useId();
  const statusId = useId();
  const Icon = entry.pasted ? ClipboardIcon : entry.detected?.category === "image" ? ImageIcon : FileIcon;
  const format = entry.detected ? (t.formats[entry.detected.format] ?? entry.detected.format) : undefined;
  const roles = rolesFor(entry);

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { ...smooth, opacity: tween(0.18) } }}
      exit={{ opacity: 0, transition: tween(0.15) }}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-card border bg-white/[0.02] px-3 py-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]",
        problem ? "border-danger/30" : "border-app",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-8 items-center justify-center rounded-chip border border-app bg-white/[0.04]",
          problem ? "text-danger" : "text-muted",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-small font-medium text-fg" title={entry.name}>
          {entry.pasted ? `${t.panel.list.pasted} · ${entry.name}` : entry.name}
        </p>
        <p id={statusId} className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-caption text-muted">
          <span className="font-mono tabular-nums">{formatBytes(entry.size, locale)}</span>
          <span aria-hidden className="text-subtle">
            ·
          </span>
          <span>{entry.status === "detecting" ? t.panel.list.detecting : (format ?? t.formats.unknown)}</span>
          {problem && (
            <span className="inline-flex items-center gap-1 text-danger">
              <AlertIcon className="size-3.5 shrink-0" />
              {problem}
            </span>
          )}
          {!problem && report && (
            <span className="inline-flex items-center gap-1 text-warning">
              <AlertIcon className="size-3.5 shrink-0" />
              {report}
            </span>
          )}
        </p>
      </div>
      <div className="relative col-span-3 col-start-2 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1">
        <label htmlFor={selectId} className="sr-only">
          {t.panel.list.type(entry.name)}
        </label>
        <select
          id={selectId}
          value={entry.role}
          disabled={disabled || entry.status !== "ready" || roles.length < 2}
          aria-describedby={statusId}
          onChange={(event) => onRole(event.target.value as FileRole)}
          className={cn(
            "h-8 w-full appearance-none rounded-control border border-app-strong bg-surface py-0 pr-8 pl-2.5 text-small text-fg shadow-surface sm:w-52",
            "transition-colors duration-150 hover:bg-surface-hover disabled:opacity-60",
          )}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {t.roles[role]}
            </option>
          ))}
        </select>
        <ChevronDownIcon aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted" />
      </div>
      <IconButton
        data-import-remove={entry.id}
        label={t.panel.list.remove(entry.name)}
        icon={<CloseIcon />}
        size="sm"
        disabled={disabled}
        onClick={onRemove}
        className="col-start-3 row-start-1 sm:col-start-4"
      />
    </motion.li>
  );
}
