import { themeInputFor, type DesignDoc } from "@dialmade/doc";
import type { DetectionEdit, ImportedColor } from "@dialmade/import";
import { generateTheme, type ContrastCheck, type RoleKey, type ThemeRoles } from "@dialmade/palette";
import { roleKey } from "./model";

type Target = { id: string; mode: "light" | "dark"; role: RoleKey };

/** Failing pairs whose text side is a pinned color of the guide: the only ones «Ajustar a AA» may change. */
export function aaTargets(doc: DesignDoc, failures: readonly ContrastCheck[], winners: ReadonlyMap<string, ImportedColor>): Target[] {
  const pinned = themeInputFor(doc).pinned;
  const targets = new Map<string, Target>();
  for (const check of failures) {
    const [fg] = check.pair.split("/") as [RoleKey];
    const winner = winners.get(roleKey(check.mode, fg));
    if (winner && pinned?.[check.mode]?.[fg] !== undefined) targets.set(roleKey(check.mode, fg), { id: winner.id, mode: check.mode, role: fg });
  }
  return [...targets.values()];
}

/**
 * «Ajustar a AA»: the engine generates those text colors again (without their pin, so `enforceContrast`
 * moves them until the pair passes) and the chips get the new value as an edit. Backgrounds and brand
 * fills are never touched.
 */
export function aaFixEdits(doc: DesignDoc, targets: readonly Target[], edits: Readonly<Record<string, DetectionEdit>>): Record<string, DetectionEdit> {
  if (targets.length === 0) return {};
  const input = themeInputFor(doc);
  const unpin = (mode: "light" | "dark"): Partial<ThemeRoles> | undefined => {
    const roles = input.pinned?.[mode];
    if (!roles) return undefined;
    const next = { ...roles };
    for (const target of targets) if (target.mode === mode) delete next[target.role];
    return next;
  };
  const light = unpin("light");
  const dark = unpin("dark");
  const theme = generateTheme({
    ...input,
    pinned: { ...input.pinned, ...(light && { light }), ...(dark && { dark }) },
  });
  const out: Record<string, DetectionEdit> = {};
  for (const target of targets) out[target.id] = { ...edits[target.id], color: theme[target.mode][target.role] };
  return out;
}
