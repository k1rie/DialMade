import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { contrastRatio, parseColor } from "@dialmade/palette";
import { describe, expect, it } from "vitest";
import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL, FIELD_META, FIELD_SELECT } from "./fieldStyles";

const here = fileURLToPath(new URL(".", import.meta.url));
const globals = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8");

/** Hex of an app token as globals.css declares it (`--app-text-muted: oklch(…)`). */
function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(globals);
  const hex = match?.[1] ? parseColor(match[1]) : null;
  if (!hex) throw new Error(`token --${name} not found or not a color`);
  return hex;
}

/** Backgrounds the right panel, its popovers and the report sit on. */
const BACKGROUNDS = ["app-bg", "app-bg-elevated", "app-surface"];

/** Every source file of Layout mode: all of LayoutStep (panels, canvas, library, lists) and the /dev/layout page. */
function layoutSources(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  const walk = (dir: string, label: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path, `${label}${name}/`);
      else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push({ file: `${label}${name}`, text: readFileSync(path, "utf8") });
    }
  };
  walk(here, "LayoutStep/");
  walk(fileURLToPath(new URL("../../app/dev/layout/", import.meta.url)), "app/dev/layout/");
  // fieldStyles.ts explains the rule in its header comment: only its code counts.
  return out.map((source) => (source.file === "LayoutStep/fieldStyles.ts" ? { ...source, text: source.text.replace(/\/\*[\s\S]*?\*\//g, "") } : source));
}

/** Whether the JSX element whose opening tag contains `index` is aria-hidden (the attribute may sit on another line). */
function inHiddenTag(text: string, index: number): boolean {
  const open = text.lastIndexOf("<", index);
  if (open === -1) return false;
  const tag = text.slice(open, index);
  return !tag.includes(">") && /\baria-hidden\b/.test(tag);
}

describe("panel text contrast (WCAG 1.4.3, DESIGN-BRIEF tokens)", () => {
  it("text-muted reaches 4.5:1 on every panel background; text-subtle does not (only ≥14 px semibold or decorative)", () => {
    for (const background of BACKGROUNDS) {
      expect(contrastRatio(token("app-text-muted"), token(background)), background).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(token("app-text-subtle"), token(background)), background).toBeLessThan(4.5);
    }
  });

  it("paints hints, labels, units, counters and placeholders of the fields in text-muted", () => {
    for (const style of [FIELD_HINT, FIELD_LABEL, FIELD_META]) {
      expect(style).toContain("text-muted");
      expect(style).not.toContain("text-subtle");
    }
    for (const control of [FIELD_CONTROL, FIELD_SELECT]) {
      expect(control).toContain("placeholder:text-muted");
      expect(control).not.toContain("text-subtle");
    }
  });

  it("keeps text-subtle in Layout mode for decorative (aria-hidden) glyphs and disabled controls only", () => {
    const offenders: string[] = [];
    for (const { file, text } of layoutSources()) {
      // Each class that paints with the token, variants included («placeholder:text-subtle»). A CSS
      // variable (`var(--app-text-subtle)`, an SVG stroke) is not text.
      for (const match of text.matchAll(/[^\s"'`{}()]*text-subtle/g)) {
        const cls = match[0];
        if (cls.startsWith("--")) continue;
        // Inactive controls are exempt from 1.4.3; an aria-hidden glyph («·», an icon) is decorative.
        if (cls.startsWith("disabled:") || inHiddenTag(text, match.index)) continue;
        offenders.push(`${file}:${text.slice(0, match.index).split("\n").length}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
