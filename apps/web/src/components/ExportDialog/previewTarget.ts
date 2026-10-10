import type { OutputKind } from "@dialmade/catalog";
import { orderedScreens, type DesignDoc } from "@dialmade/doc";

/** What the preview card shows: the mini of `kind`, named `label` («Precios», «Guía de estilo»…). */
export type PreviewTarget = { kind: OutputKind; label: string };

const KIND_ORDER: readonly OutputKind[] = ["brand", "landing", "app"];

/**
 * The page of the preview card. The first key that names a page of the doc wins: `requested` (the dialog's
 * prop), then `active` (the Composer's tab), each a screen id or a kind (`"brand"`, or `"landing"`/`"app"` in a
 * document without screens). Fallback: the first screen, else the focus page, else any page.
 */
export function previewTarget(
  doc: DesignDoc,
  keys: readonly (string | null | undefined)[],
  kindLabel: (kind: OutputKind) => string,
): PreviewTarget {
  const screens = orderedScreens(doc);
  const kindTarget = (kind: OutputKind): PreviewTarget => ({ kind, label: kindLabel(kind) });
  for (const key of keys) {
    if (!key) continue;
    const screen = screens.find((entry) => entry.id === key);
    if (screen) return { kind: screen.kind, label: screen.name };
    const kind = KIND_ORDER.find((entry) => entry === key);
    // With screens, `landing`/`app` pages do not exist: only the style guide is a kind.
    if (kind && doc.pages[kind] && (screens.length === 0 || kind === "brand")) return kindTarget(kind);
  }
  const first = screens[0];
  if (first) return { kind: first.kind, label: first.name };
  const focus = doc.brief.focus;
  if (doc.pages[focus]) return kindTarget(focus);
  return kindTarget(KIND_ORDER.find((kind) => doc.pages[kind]) ?? focus);
}
