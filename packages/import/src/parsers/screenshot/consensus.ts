import { hexToOklch } from "@dialmade/palette";
import { hueDelta } from "../../color";
import type { BatchFile } from "../../registry";
import type { Mode, ScreenshotSummary } from "../../types";
import { ACCENT_MIN_C, SAME_ACCENT_HUE, SAME_TINT_HUE, TINTED_C } from "./constants";
import { hueOf } from "./oklab";

/** What one screenshot says (a `ScreenshotSummary` fits). */
export type ScreenshotVote = Pick<ScreenshotSummary, "mode" | "neutralTint" | "vibrancy" | "accentCandidate">;

export interface ScreenshotConsensus {
  count: number;
  /** `both` when there are light and dark screenshots (an app with both modes, or two apps). */
  mode: Mode | "both" | "ambiguous";
  modeVotes: Record<Mode | "ambiguous", number>;
  /** The accent most screenshots agree on (hues within 25° are one color: light and dark variants). */
  accent?: { hex: string; votes: number };
  /** Every accent group, most votes first. */
  accentVotes: { hex: string; votes: number }[];
  /** Vector mean of the tinted screenshots (`c: 0` when every one is pure gray). */
  neutralTint: { h: number; c: number };
  /** Median of the screenshots with colored pixels. */
  vibrancy: { c: number; l: number };
  /** 0–1 per attribute; present only when at least two screenshots vote on it. */
  agreement: { accent?: number; tint?: number };
  /** Mean of `agreement` (1 when nothing can disagree). Mode is reported, not scored: both modes are legitimate. */
  consistency: number;
  /** `screenshots-accent-mixed`, `screenshots-tint-mixed`, `screenshots-mode-mixed` (informative). */
  warnings: { code: string; detail: string }[];
}

const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Greedy hue groups in input order; each group keeps its first member as representative. */
function groupByHue<T>(items: readonly T[], hue: (item: T) => number, within: number) {
  const groups: { hue: number; first: T; members: T[] }[] = [];
  for (const item of items) {
    const h = hue(item);
    const group = groups.find((g) => Math.abs(hueDelta(g.hue, h)) <= within);
    if (group) group.members.push(item);
    else groups.push({ hue: h, first: item, members: [item] });
  }
  return groups.sort((a, b) => b.members.length - a.members.length);
}

/**
 * Votes across several screenshots of the same app: mode by count, accent by hue groups, the tint
 * by vector mean, vibrancy by median. Reports how much they agree and warns when the accents or the
 * gray tints disagree (or, as information, when both modes appear). Null for an empty list.
 */
export function aggregateScreenshots(shots: readonly ScreenshotVote[]): ScreenshotConsensus | null {
  if (shots.length === 0) return null;
  const warnings: ScreenshotConsensus["warnings"] = [];
  const agreement: ScreenshotConsensus["agreement"] = {};

  const modeVotes = { light: 0, dark: 0, ambiguous: 0 };
  for (const s of shots) modeVotes[s.mode === "light" || s.mode === "dark" ? s.mode : "ambiguous"]++;
  const mode: ScreenshotConsensus["mode"] =
    modeVotes.light > 0 && modeVotes.dark > 0 ? "both" : modeVotes.light > 0 ? "light" : modeVotes.dark > 0 ? "dark" : "ambiguous";
  if (mode === "both") warnings.push({ code: "screenshots-mode-mixed", detail: `light ×${modeVotes.light} · dark ×${modeVotes.dark}` });

  const accents = shots.flatMap((s) => {
    const o = s.accentCandidate ? hexToOklch(s.accentCandidate) : null;
    return o && s.accentCandidate && o.c >= ACCENT_MIN_C ? [{ hex: s.accentCandidate.toLowerCase(), h: o.h }] : [];
  });
  const accentGroups = groupByHue(accents, (a) => a.h, SAME_ACCENT_HUE);
  const accentVotes = accentGroups.map((g) => ({ hex: g.first.hex, votes: g.members.length }));
  if (accents.length >= 2) agreement.accent = round(accentVotes[0]!.votes / accents.length, 3);
  if (accentGroups.length > 1) warnings.push({ code: "screenshots-accent-mixed", detail: accentVotes.map((v) => `${v.hex} ×${v.votes}`).join(" · ") });

  const tints = shots.filter((s) => s.neutralTint.c >= TINTED_C);
  let neutralTint = { h: 0, c: 0 };
  if (tints.length > 0) {
    let a = 0;
    let b = 0;
    for (const t of tints) {
      a += t.neutralTint.c * Math.cos((t.neutralTint.h * Math.PI) / 180);
      b += t.neutralTint.c * Math.sin((t.neutralTint.h * Math.PI) / 180);
    }
    const c = Math.hypot(a, b) / tints.length;
    neutralTint = c > 0 ? { h: Math.round(hueOf(a, b)) % 360, c: round(c, 4) } : neutralTint;
  }
  if (tints.length >= 2) {
    const groups = groupByHue(tints, (t) => t.neutralTint.h, SAME_TINT_HUE);
    agreement.tint = round(groups[0]!.members.length / tints.length, 3);
    if (groups.length > 1) warnings.push({ code: "screenshots-tint-mixed", detail: groups.map((g) => `h${Math.round(g.hue)} ×${g.members.length}`).join(" · ") });
  }

  const colored = shots.filter((s) => s.vibrancy.c > 0);
  const vibrancy = colored.length > 0 ? { c: round(median(colored.map((s) => s.vibrancy.c)), 3), l: round(median(colored.map((s) => s.vibrancy.l)), 3) } : { c: 0, l: 0 };

  const scores = Object.values(agreement);
  return {
    count: shots.length,
    mode,
    modeVotes,
    ...(accentVotes[0] && { accent: accentVotes[0] }),
    accentVotes,
    neutralTint,
    vibrancy,
    agreement,
    consistency: scores.length > 0 ? round(scores.reduce((sum, v) => sum + v, 0) / scores.length, 3) : 1,
    warnings,
  };
}

interface Ballot {
  vote: ScreenshotVote | null;
  /** «Referencia de otra app»: another brand, so it never votes. */
  reference: boolean;
}

const ballots = new WeakMap<readonly BatchFile[], Map<string, Ballot>>();

/**
 * Records a screenshot's vote for the batch it belongs to (`ctx.batch` identifies it). The call
 * that completes the batch's screenshots gets the consensus of the user's own captures (references
 * excluded), when there are at least two; every other call gets null. Parsing order does not matter.
 */
export function castBatchVote(batch: readonly BatchFile[], sourceId: string, ballot: Ballot): ScreenshotConsensus | null {
  const ids = batch.filter((f) => f.parserId === "screenshot").map((f) => f.sourceId);
  if (!ids.includes(sourceId)) return null;
  let box = ballots.get(batch);
  if (!box) {
    box = new Map();
    ballots.set(batch, box);
  }
  box.set(sourceId, ballot);
  if (!ids.every((id) => box.has(id))) return null;
  const votes = ids.flatMap((id) => {
    const b = box.get(id)!;
    return b.vote && !b.reference ? [b.vote] : [];
  });
  return votes.length >= 2 ? aggregateScreenshots(votes) : null;
}
