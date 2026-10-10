import { createDesignDoc, isLocked, pinnedFor, themeInputFor } from "@dialmade/doc";
import { applyImport, defaultSelection, importBatch, type ImportedBrand } from "@dialmade/import";
import { generateTheme } from "@dialmade/palette";
import { beforeAll, describe, expect, it } from "vitest";
import { aaFixEdits, aaTargets } from "./aa";
import {
  assignRole,
  chipItems,
  chipState,
  counts,
  defaultLock,
  dismissChip,
  editChip,
  exitOf,
  guidePrimary,
  initialReview,
  restoreChip,
  roleWinners,
  selectionOf,
  slotMode,
  type ReviewState,
} from "./model";

const RIGHTS = "2026-10-10T08:00:00.000Z";
const encode = (text: string) => new TextEncoder().encode(text);

// Fictional brand «Brisa»: a shadcn-like globals.css with both modes, a font and a radius.
const GLOBALS = `:root {
  --background: #ffffff;
  --foreground: #14161f;
  --primary: #2f6fde;
  --primary-foreground: #ffffff;
  --secondary: #f2994a;
  --border: #e4e6ee;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius: 0.5rem;
}
.dark {
  --background: #0d0f16;
  --foreground: #f4f5f9;
  --primary: #6b9bff;
  --border: oklch(1 0 0 / 10%);
}
`;

const PASTED = "Primary: #2f6fde\nAccent: #e8573f\n#7a3cff";

async function batch(files: { name: string; text: string; pasted?: boolean }[], ownership: "own" | "third-party" = "own"): Promise<ImportedBrand> {
  return importBatch(
    files.map((file) => ({ name: file.name, bytes: encode(file.text), ...(file.pasted && { pasted: true }) })),
    { ownership, ...(ownership === "own" && { rightsConfirmedAt: RIGHTS }) },
  );
}

const baseDoc = () => createDesignDoc({ brand: { name: "Brisa", seeds: { primary: "#7c5cff" } }, brief: { locale: "es" } });

let css: ImportedBrand;
let pasted: ImportedBrand;

beforeAll(async () => {
  css = await batch([{ name: "globals.css", text: GLOBALS }]);
  pasted = await batch([{ name: "pegado-1.txt", text: PASTED, pasted: true }]);
});

const start = (brand: ImportedBrand): ReviewState => initialReview(defaultSelection(brand));

describe("chipItems", () => {
  it("lists the slot roles first, light before dark, then the rest of the groups", () => {
    const colors = chipItems(css).filter((item) => item.kind === "color");
    const first = colors[0];
    expect(first?.kind === "color" && [first.color.role, first.color.mode ?? "light"]).toEqual(["primary", "light"]);
    const roles = colors.map((item) => (item.kind === "color" ? `${item.color.mode ?? "light"}:${item.color.role}` : ""));
    expect(roles.indexOf("light:primary")).toBeLessThan(roles.indexOf("dark:primary"));
    expect(roles.indexOf("light:background")).toBeLessThan(roles.indexOf("light:border"));
    expect(chipItems(css).some((item) => item.kind === "radius")).toBe(true);
  });
});

describe("locks", () => {
  it("locks own declared values by default, never third-party ones, and edits always", () => {
    const primary = chipItems(css).find((item) => item.kind === "color" && item.color.role === "primary")!;
    expect(defaultLock(primary, css, "own")).toBe(true);
    expect(defaultLock(primary, css, "third-party")).toBe(false);
    const loose = chipItems(pasted).find((item) => item.kind === "color" && !item.color.role)!;
    expect(defaultLock(loose, pasted, "own", { color: "#123456" })).toBe(true);
  });
});

describe("role slots", () => {
  it("puts a dropped color in the slot and the import writes exactly that one", () => {
    let review = start(pasted);
    const loose = pasted.colors.find((color) => !color.role)!;
    expect(chipState(loose.id, review)).not.toBe("accepted");
    review = assignRole(review, pasted, loose.id, "primary", "light");
    expect(chipState(loose.id, review)).toBe("accepted");
    const winners = roleWinners(pasted, review, "own");
    expect(winners.get("light:primary")?.id).toBe(loose.id);
    expect(slotMode(winners)).toBe("light");

    const { selection } = selectionOf(pasted, review);
    const result = applyImport(baseDoc(), pasted, selection, { ownership: "own", rightsConfirmedAt: RIGHTS });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.tokens.color.light.primary).toBe(loose.hex);
    expect(result.doc.brand.seeds.primary).toBe(loose.hex);
    expect(guidePrimary(pasted, selection, "own")).toBe(loose.hex);
  });

  it("empties a role with `null` and keeps the color included", () => {
    let review = start(css);
    const primary = css.colors.find((color) => color.role === "primary" && (color.mode ?? "light") === "light")!;
    review = assignRole(review, css, primary.id, null, "light");
    expect(roleWinners(css, review, "own").has("light:primary")).toBe(false);
    expect(chipState(primary.id, review)).toBe("accepted");
  });
});

describe("choices", () => {
  it("dismisses, restores and edits chips", () => {
    let review = start(css);
    const border = css.colors.find((color) => color.role === "border" && color.mode === "dark")!;
    expect(border.alpha).toBeCloseTo(0.1, 2);
    review = dismissChip(review, border.id);
    expect(chipState(border.id, review)).toBe("dismissed");
    expect(selectionOf(css, review).selection.dismissed).toContain(border.id);
    review = restoreChip(review, border.id);
    expect(chipState(border.id, review)).toBe("accepted");
    review = editChip(review, border.id, { color: "oklch(1 0 0 / 15%)" });
    const result = applyImport(baseDoc(), css, selectionOf(css, review).selection, { ownership: "own", rightsConfirmedAt: RIGHTS });
    expect(result.ok && result.doc.tokens.color.dark.border).toBe("#ffffff26");
  });

  it("folds the logo-vs-guide card into the selection", () => {
    const brand: ImportedBrand = {
      ...css,
      conflicts: [{ role: "primary", guideId: css.colors.find((c) => c.role === "primary" && (c.mode ?? "light") === "light")!.id, guide: "#2f6fde", logo: "#e8573f", deltaE: 0.3, choices: ["guide", "logo", "guide-primary-logo-secondary"] }],
    };
    const review = start(brand);
    expect(selectionOf(brand, review).extraOps).toEqual([]);
    const logo = selectionOf(brand, { ...review, conflicts: { primary: "logo" } });
    expect(guidePrimary(brand, logo.selection, "own")).toBe("#e8573f");
    const mix = selectionOf(brand, { ...review, conflicts: { primary: "guide-primary-logo-secondary" } });
    expect(mix.extraOps).toEqual([{ op: "add", path: "/brand/seeds/secondary", value: "#e8573f" }]);
  });
});

describe("exit", () => {
  it("goes to «Crear» with a complete guide and to the Palette Lab with a partial one", () => {
    expect(exitOf(css, start(css), "own")).toBe("create");
    const noFonts = css.fonts.reduce((review, font) => dismissChip(review, font.id), start(css));
    expect(exitOf(css, noFonts, "own")).toBe("palette");
    expect(counts(css, start(css), "own").fonts).toBeGreaterThan(0);
  });

  it("keeps only references without the rights statement", async () => {
    const thirdParty = await batch([{ name: "globals.css", text: GLOBALS }], "third-party");
    const review = start(thirdParty);
    expect(exitOf(thirdParty, review, "third-party")).toBe("references");
    expect(counts(thirdParty, review, "third-party").colors).toBe(0);
  });

  it("locks what the guide declares when applied", () => {
    const result = applyImport(baseDoc(), css, selectionOf(css, start(css)).selection, { ownership: "own", rightsConfirmedAt: RIGHTS });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(isLocked(result.doc, "/tokens/color/light/primary")).toBe(true);
    expect(pinnedFor(result.doc)?.light?.primary).toBe("#2f6fde");
  });
});

describe("«Ajustar a AA»", () => {
  it("regenerates only the failing text colors of the guide, and then the pairs pass", async () => {
    const brand = await batch([
      { name: "low.css", text: ":root { --background: #ffffff; --foreground: #b8b8b8; --primary: #2f6fde; }" },
    ]);
    const review = start(brand);
    const { selection } = selectionOf(brand, review);
    const applied = applyImport(baseDoc(), brand, selection, { ownership: "own", rightsConfirmedAt: RIGHTS });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const failures = generateTheme(themeInputFor(applied.doc)).contrast.filter((check) => check.source === "imported" && !check.pass);
    expect(failures.some((check) => check.pair === "foreground/background")).toBe(true);

    const winners = roleWinners(brand, review, "own");
    const targets = aaTargets(applied.doc, failures, winners);
    expect(targets.map((target) => target.role)).toContain("foreground");
    const edits = aaFixEdits(applied.doc, targets, review.edits);
    const fixed = Object.entries(edits).reduce((current, [id, edit]) => editChip(current, id, edit), review);
    const again = applyImport(baseDoc(), brand, selectionOf(brand, fixed).selection, { ownership: "own", rightsConfirmedAt: RIGHTS });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.doc.tokens.color.light.background).toBe("#ffffff");
    const after = generateTheme(themeInputFor(again.doc)).contrast.find((check) => check.mode === "light" && check.pair === "foreground/background");
    expect(after?.pass).toBe(true);
  });
});
