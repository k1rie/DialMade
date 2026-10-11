// The navigation of app screens, designed by «Diseño con IA» like any block. On app screens the navigation is not a
// layout block but the frame (`screen.shell`, the `app.shell` element of @dialmade/sections): its sidebar (or rail)
// and its top bar. Each one is an AI piece with its own id, stored next to the blocks in `screen.aiRender.blocks` and
// painted by the frame in its slot. App screens share their navigation (the doc schema keeps one `nav` for all), so
// the pieces are kit pieces: designed once and cloned into the other app screens (spec §4.3).
import { AI_SHELL_BAR_ID, AI_SHELL_NAV_ID, type Screen } from "@dialmade/doc";
import type { RenderBlockInput } from "./prompt";

/** The frame's element id (@dialmade/sections `SHELL_ELEMENT_ID`). */
export const AI_SHELL_ELEMENT_ID = "shell";
/** The sidebar or rail of the frame, and its top bar (with the navigation in it when the frame is a top nav). */
export { AI_SHELL_BAR_ID, AI_SHELL_NAV_ID };

export const CHROME_TYPES = ["app-sidebar", "app-rail", "app-topbar", "app-topnav"] as const;
export type ChromeType = (typeof CHROME_TYPES)[number];
export type AiChromePiece = { id: typeof AI_SHELL_NAV_ID | typeof AI_SHELL_BAR_ID; type: ChromeType };

const LABELS: Readonly<Record<"es" | "en", Readonly<Record<ChromeType, string>>>> = {
  es: { "app-sidebar": "Barra lateral", "app-rail": "Barra lateral compacta", "app-topbar": "Barra superior", "app-topnav": "Navegación superior" },
  en: { "app-sidebar": "Sidebar", "app-rail": "Rail", "app-topbar": "Top bar", "app-topnav": "Top navigation" },
};

/** How big each piece is on a desktop, for the prompt (the frame decides the real size). */
const SIZE: Readonly<Record<ChromeType, { cols: number; heightPx: number }>> = {
  "app-sidebar": { cols: 2, heightPx: 800 },
  "app-rail": { cols: 1, heightPx: 800 },
  "app-topbar": { cols: 10, heightPx: 64 },
  "app-topnav": { cols: 12, heightPx: 64 },
};

export const isChromeId = (id: string): id is AiChromePiece["id"] => id === AI_SHELL_NAV_ID || id === AI_SHELL_BAR_ID;
export const isChromeType = (type: string): type is ChromeType => (CHROME_TYPES as readonly string[]).includes(type);
export const chromeLabel = (type: ChromeType, locale: "es" | "en"): string => LABELS[locale][type];

/** The AI pieces a frame has by its navigation: none on landings or without navigation; a top nav only its bar. */
export function chromePiecesFor(screen: Pick<Screen, "kind" | "shell">): AiChromePiece[] {
  if (screen.kind !== "app" || !screen.shell || screen.shell.nav === "none") return [];
  if (screen.shell.nav === "topnav") return [{ id: AI_SHELL_BAR_ID, type: "app-topnav" }];
  return [
    { id: AI_SHELL_NAV_ID, type: screen.shell.nav === "rail" ? "app-rail" : "app-sidebar" },
    { id: AI_SHELL_BAR_ID, type: "app-topbar" },
  ];
}

/** The AI pieces of a built screen's frame (`chromePiecesFor`, once the page has its frame element). */
export function chromePieces(screen: Pick<Screen, "kind" | "shell" | "page">): AiChromePiece[] {
  return Object.hasOwn(screen.page.elements, AI_SHELL_ELEMENT_ID) ? chromePiecesFor(screen) : [];
}

/** The piece with that id on the screen's frame, if the frame has it now. */
export const chromePieceOf = (screen: Pick<Screen, "kind" | "shell" | "page">, id: string): AiChromePiece | undefined => chromePieces(screen).find((piece) => piece.id === id);

type ShellCopy = {
  brandName?: unknown;
  workspace?: unknown;
  searchPlaceholder?: unknown;
  showSearch?: unknown;
  nav?: unknown;
  activeId?: unknown;
  user?: unknown;
};

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() !== "" ? value.replace(/\s+/g, " ").trim().slice(0, 120) : null);

/**
 * The prompt input of one piece, from the frame's visible props: its copy as the draft, and the navigation items with
 * the href each one must keep (`#screen:ID` for a screen of the document, `#` otherwise) and the current one.
 */
export function chromeBlockInput(piece: AiChromePiece, shellProps: unknown, context: { locale: "es" | "en"; screenIds: ReadonlySet<string>; brandName: string }): RenderBlockInput {
  const props = (shellProps && typeof shellProps === "object" ? shellProps : {}) as ShellCopy;
  const user = (props.user && typeof props.user === "object" ? props.user : {}) as { name?: unknown; role?: unknown };
  const brand = text(props.brandName) ?? context.brandName;
  const search = props.showSearch === false ? null : text(props.searchPlaceholder);
  const items = (Array.isArray(props.nav) ? props.nav : []).flatMap((item) => {
    const { id, label } = (item ?? {}) as { id?: unknown; label?: unknown };
    const name = text(label);
    if (!name || typeof id !== "string") return [];
    return [{ label: name, href: context.screenIds.has(id) ? `#screen:${id}` : "#", ...(id === props.activeId && { current: true as const }) }];
  });
  const draft: Record<ChromeType, (string | null)[]> = {
    "app-sidebar": [brand, text(props.workspace), text(user.name), text(user.role)],
    "app-rail": [brand, text(user.name)],
    "app-topbar": [search, text(user.name)],
    "app-topnav": [brand, search, text(user.name)],
  };
  return {
    id: piece.id,
    type: piece.type,
    label: chromeLabel(piece.type, context.locale),
    ...SIZE[piece.type],
    draft: draft[piece.type].filter((line): line is string => line !== null),
    ...(piece.type !== "app-topbar" && items.length > 0 && { nav: { items } }),
  };
}
