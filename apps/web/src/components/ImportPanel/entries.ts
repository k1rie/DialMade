import type { DetectedFormat, FileRole } from "@dialmade/import";
import { MAX_LOGO_BYTES, isAcceptedLogo } from "@/lib/image";
import { FILE_ROLES, IMAGE_ROLES, LOGO_NAME, MAX_FILES, MAX_IMAGES, TEXT_ROLES } from "./constants";

export type ImportEntry = {
  id: string;
  file: File;
  name: string;
  size: number;
  pasted: boolean;
  role: FileRole;
  /** The user picked the type: detection no longer changes it. */
  roleTouched: boolean;
  status: "detecting" | "ready";
  /** Undefined once ready means detection failed. */
  detected?: DetectedFormat;
  maxBytes?: number;
};

export type EntryProblem =
  | { code: "detect-failed" | "empty" | "logo-format" | "not-logo" | "svg-logo" | "one-logo" }
  | { code: "too-large"; limit: number }
  | { code: "later" | "never"; format: string }
  | { code: "too-many-files"; max: number }
  | { code: "too-many-images"; max: number };

const isImage = (entry: ImportEntry) => entry.detected?.category === "image";

/** «Mi logo» for an SVG or an image named like one, «Captura de mi app» for other images, a guide otherwise. */
export function defaultRole(detected: DetectedFormat | undefined, name: string): FileRole {
  if (!detected) return "guide";
  if (detected.format === "svg" || detected.unsupported === "logo") return "logo";
  if (detected.category === "image") return LOGO_NAME.test(name) ? "logo" : "screenshot";
  if (detected.format === "font-names") return "font";
  return "guide";
}

export function rolesFor(entry: Pick<ImportEntry, "detected" | "status">): readonly FileRole[] {
  if (entry.status !== "ready" || !entry.detected) return FILE_ROLES;
  if (entry.detected.format === "svg" || entry.detected.unsupported === "logo") return ["logo"];
  if (entry.detected.category === "image") return IMAGE_ROLES;
  if (entry.detected.category === "text") return TEXT_ROLES;
  return FILE_ROLES;
}

/**
 * Why each entry would not be read, with the batch in view: one logo, at most `MAX_FILES` files and
 * `MAX_IMAGES` images (in list order). Entries still detecting have no problem yet.
 */
export function entryProblems(entries: readonly ImportEntry[]): Map<string, EntryProblem> {
  const problems = new Map<string, EntryProblem>();
  let files = 0;
  let images = 0;
  let logo = false;
  for (const entry of entries) {
    if (entry.status !== "ready") continue;
    const problem = ownProblem(entry);
    if (problem) {
      problems.set(entry.id, problem);
      continue;
    }
    if (entry.role === "logo") {
      if (logo) problems.set(entry.id, { code: "one-logo" });
      logo = true;
      continue;
    }
    if (++files > MAX_FILES) {
      problems.set(entry.id, { code: "too-many-files", max: MAX_FILES });
      continue;
    }
    if (isImage(entry) && ++images > MAX_IMAGES) problems.set(entry.id, { code: "too-many-images", max: MAX_IMAGES });
  }
  return problems;
}

function ownProblem(entry: ImportEntry): EntryProblem | undefined {
  const { detected } = entry;
  if (!detected) return { code: "detect-failed" };
  if (detected.category === "empty" || entry.size === 0) return { code: "empty" };
  if (entry.role === "logo") {
    if (detected.category !== "image" && detected.format !== "svg") return { code: "not-logo" };
    return isAcceptedLogo(entry.file) && entry.size <= MAX_LOGO_BYTES ? undefined : { code: "logo-format" };
  }
  if (detected.unsupported === "logo") return { code: "svg-logo" };
  if (detected.unsupported === "v1.1" || detected.unsupported === "v2") return { code: "later", format: detected.format };
  if (detected.unsupported === "never") return { code: "never", format: detected.format };
  if (entry.maxBytes !== undefined && entry.size > entry.maxBytes) return { code: "too-large", limit: entry.maxBytes };
  return undefined;
}

/** How many usable entries of each type (for «3 archivos: 1 guía, 2 capturas»). */
export function roleCounts(entries: readonly ImportEntry[], problems: ReadonlyMap<string, EntryProblem>): Partial<Record<FileRole, number>> {
  const counts: Partial<Record<FileRole, number>> = {};
  for (const entry of entries) {
    if (entry.status !== "ready" || problems.has(entry.id)) continue;
    counts[entry.role] = (counts[entry.role] ?? 0) + 1;
  }
  return counts;
}

/** `1,2 MB` / `340 KB` in the user's locale. */
export function formatBytes(bytes: number, locale: string): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: mb >= 10 ? 0 : 1 }).format(mb)} MB`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.max(1, bytes / 1024))} KB`;
}
