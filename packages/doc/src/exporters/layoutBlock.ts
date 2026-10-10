import type { Locale } from "@dialmade/catalog";
import {
  absorbChildren,
  areaName,
  deriveResponsive,
  getBlockDef,
  inferStructure,
  isLibraryBlockType,
  toAsciiWireframe,
  type MobileBehavior,
  type ResponsiveLayout,
  type Structure,
  type StructureNode,
} from "@dialmade/layout";
import type { AppNavId } from "../constants";
import { SCREEN_EXPORT_FILES } from "../constants";
import type { DesignDoc, Screen, ScreenKind, ScreenLayout } from "../schema";
import { orderedScreens } from "../screens";

/** Width of the ASCII wireframes, in characters. */
const WIREFRAME_WIDTH = 64;
/** Screen names listed in a prompt pack's task before «+N». */
const TASK_NAMES = 6;

type LayoutCopy = {
  flowTitle: string;
  flowIntro: string;
  /** DESIGN.md only: the per-screen files of the code pack. */
  files: string;
  kinds: Record<ScreenKind, string>;
  nav: Record<AppNavId, string>;
  navLine: (nav: string) => string;
  header: (on: boolean) => string;
  linksTitle: string;
  noLinks: string;
  linkFrom: (block: string) => string;
  sharedNav: (nav: string, names: string) => string;
  empty: string;
  readingOrder: string;
  linksTo: (name: string) => string;
  note: (text: string) => string;
  absorbs: (names: string) => string;
  hiddenBlocks: (names: string) => string;
  tablet: string;
  tabletSame: string;
  rowKeep: (names: string, spans: string) => string;
  rowWrap: (names: string) => string;
  gridKeep: (names: string) => string;
  gridStack: (names: string) => string;
  sidebarToRail: string;
  hiddenOn: (names: string) => string;
  mobile: string;
  mobileBase: string;
  navToTopBar: string;
  behaviors: Record<MobileBehavior, string>;
  grid: (areas: string, legend: string) => string;
  gridOverlap: (names: string) => string;
  and: string;
};

const ES: LayoutCopy = {
  flowTitle: "Pantallas y flujo",
  flowIntro:
    "Una ruta por pantalla, en este orden. Cada pantalla es una rejilla de 12 columnas (filas de 8 px); su wireframe y su orden de lectura usan los mismos números.",
  files: `En el pack de código, cada pantalla lleva junto a su \`index.html\` su \`${SCREEN_EXPORT_FILES.layoutCss}\` (la rejilla; va después del CSS del kit) y su \`${SCREEN_EXPORT_FILES.layoutJson}\` (bloques, orden de lectura, reglas de tablet y móvil y enlaces).`,
  kinds: { landing: "Web pública", app: "Pantalla de app" },
  nav: { sidebar: "Lateral", rail: "Rail", topnav: "Superior", none: "Ninguna" },
  navLine: (nav) => `navegación: ${nav}`,
  header: (on) => (on ? "con cabecera de página" : "sin cabecera de página"),
  linksTitle: "Enlaces:",
  noLinks: "Todavía no hay enlaces entre pantallas.",
  linkFrom: (block) => `desde «${block}»`,
  sharedNav: (nav, names) => `La navegación ${nav} enlaza las pantallas de app: ${names}.`,
  empty: "Sin bloques todavía.",
  readingOrder: "Orden de lectura (DOM, foco y móvil):",
  linksTo: (name) => `enlaza a «${name}»`,
  note: (text) => `nota: "${text}"`,
  absorbs: (names) => `con ${names} dentro`,
  hiddenBlocks: (names) => `Ocultos: ${names}.`,
  tablet: "Tablet (8 columnas, menos de 64rem)",
  tabletSame: "mismo orden; los anchos se escalan a 8 columnas",
  rowKeep: (names, spans) => `${names} siguen en fila (${spans} de 8 columnas)`,
  rowWrap: (names) => `${names} pasan a varias líneas`,
  gridKeep: (names) => `${names} mantienen la rejilla`,
  gridStack: (names) => `${names} se apilan`,
  sidebarToRail: "la navegación lateral pasa a rail",
  hiddenOn: (names) => `ocultos: ${names}`,
  mobile: "Móvil (4 columnas, menos de 40rem)",
  mobileBase: "todo en una columna, a ancho completo y en el orden de lectura",
  navToTopBar: "la navegación pasa a una barra superior",
  behaviors: {
    stack: "apilado",
    hamburger: "menú hamburguesa",
    drawer: "cajón lateral",
    tabbar: "barra de pestañas abajo",
    "grid-2x2": "rejilla 2×2",
    "one-column": "una columna",
    carousel: "carrusel",
    "card-list": "lista de tarjetas",
    agenda: "agenda",
    "text-first": "texto arriba",
    sheet: "hoja inferior",
    accordion: "acordeón",
    "scroll-x": "scroll horizontal",
    hide: "oculto",
  },
  grid: (areas, legend) => `Rejilla sin corte limpio: \`grid-template-areas: ${areas}\` (${legend})`,
  gridOverlap: (names) => `Rejilla con solapes (${names}): colocación por líneas, sin \`grid-template-areas\``,
  and: "y",
};

const EN: LayoutCopy = {
  flowTitle: "Screens and flow",
  flowIntro:
    "One route per screen, in this order. Each screen is a 12-column grid (8px rows); its wireframe and its reading order share the same numbers.",
  files: `In the code pack, each screen carries its \`${SCREEN_EXPORT_FILES.layoutCss}\` (the grid; load it after the kit CSS) and its \`${SCREEN_EXPORT_FILES.layoutJson}\` (blocks, reading order, tablet and phone rules and links) next to its \`index.html\`.`,
  kinds: { landing: "Public website", app: "App screen" },
  nav: { sidebar: "Sidebar", rail: "Rail", topnav: "Top bar", none: "None" },
  navLine: (nav) => `navigation: ${nav}`,
  header: (on) => (on ? "with page header" : "without page header"),
  linksTitle: "Links:",
  noLinks: "No links between screens yet.",
  linkFrom: (block) => `from "${block}"`,
  sharedNav: (nav, names) => `The ${nav} navigation links the app screens: ${names}.`,
  empty: "No blocks yet.",
  readingOrder: "Reading order (DOM, focus and phone):",
  linksTo: (name) => `links to "${name}"`,
  note: (text) => `note: "${text}"`,
  absorbs: (names) => `with ${names} inside`,
  hiddenBlocks: (names) => `Hidden: ${names}.`,
  tablet: "Tablet (8 columns, under 64rem)",
  tabletSame: "same order; widths scale to 8 columns",
  rowKeep: (names, spans) => `${names} stay in a row (${spans} of 8 columns)`,
  rowWrap: (names) => `${names} wrap onto several lines`,
  gridKeep: (names) => `${names} keep the grid`,
  gridStack: (names) => `${names} stack`,
  sidebarToRail: "the sidebar navigation becomes a rail",
  hiddenOn: (names) => `hidden: ${names}`,
  mobile: "Phone (4 columns, under 40rem)",
  mobileBase: "everything in one full-width column, in reading order",
  navToTopBar: "the navigation becomes a top bar",
  behaviors: {
    stack: "stacked",
    hamburger: "hamburger menu",
    drawer: "drawer",
    tabbar: "bottom tab bar",
    "grid-2x2": "2×2 grid",
    "one-column": "one column",
    carousel: "carousel",
    "card-list": "card list",
    agenda: "agenda",
    "text-first": "text first",
    sheet: "bottom sheet",
    accordion: "accordion",
    "scroll-x": "horizontal scroll",
    hide: "hidden",
  },
  grid: (areas, legend) => `Grid without a clean cut: \`grid-template-areas: ${areas}\` (${legend})`,
  gridOverlap: (names) => `Grid with overlaps (${names}): line placement, no \`grid-template-areas\``,
  and: "and",
};

const COPY: Record<Locale, LayoutCopy> = { es: ES, en: EN };

/** User text inside Markdown: no backticks (they would open or close code spans and fences). */
export const plainText = (text: string): string => text.replace(/`/g, "");

/** A note inside double quotes: its own double quotes become single ones. */
const quoted = (text: string) => plainText(text).replace(/"/g, "'");

const guillemets = (name: string) => `«${plainText(name)}»`;
const straight = (name: string) => `"${plainText(name).replace(/"/g, "'")}"`;

/** «A», «B» y «C» / "A", "B" and "C". */
function nameList(names: readonly string[], locale: Locale): string {
  const quote = locale === "es" ? guillemets : straight;
  const items = names.map(quote);
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} ${COPY[locale].and} ${items[items.length - 1]}` : (items[0] ?? "");
}

/** Blocks hidden on desktop: their own `hidden` or a hidden ancestor (like the engine). */
function hiddenBlocks(layout: ScreenLayout): Set<string> {
  const out = new Set<string>();
  const isHidden = (id: string, seen: Set<string>): boolean => {
    if (out.has(id)) return true;
    const block = layout.blocks[id];
    if (!block || seen.has(id)) return false;
    seen.add(id);
    const hidden = block.hidden === true || (block.parentId !== undefined && isHidden(block.parentId, seen));
    if (hidden) out.add(id);
    return hidden;
  };
  for (const id of Object.keys(layout.blocks)) isHidden(id, new Set());
  return out;
}

/** Visible blocks under a structure node, in reading order. */
function blocksUnder(node: StructureNode, hidden: ReadonlySet<string>, out: string[] = []): string[] {
  switch (node.kind) {
    case "block":
      if (!hidden.has(node.id)) out.push(node.id);
      if (node.content) blocksUnder(node.content, hidden, out);
      break;
    case "stack":
    case "row":
      for (const child of node.children) blocksUnder(child.node, hidden, out);
      break;
    case "grid":
      for (const item of node.items) blocksUnder(item.node, hidden, out);
      break;
  }
  return out;
}

/** Row and grid regions (and blocks whose content is one), depth first, in reading order. */
function regionsOf(structure: Structure): StructureNode[] {
  const out: StructureNode[] = [];
  const visit = (node: StructureNode) => {
    if (node.kind === "row" || node.kind === "grid") out.push(node);
    const children =
      node.kind === "block"
        ? node.content
          ? [node.content]
          : []
        : node.kind === "grid"
          ? node.items.map((item) => item.node)
          : node.children.map((child) => child.node);
    children.forEach(visit);
  };
  if (structure.root) visit(structure.root);
  structure.overlays.forEach(visit);
  return out;
}

interface ScreenFacts {
  screen: Screen;
  /**
   * The layout as the page is built from it (`absorbChildren`, like `buildPageFromLayout`): blocks absorbed
   * into a non-container block (a media inside a hero) have no element, so they are neither drawn nor
   * numbered; their host's line says it holds them.
   */
  layout: ScreenLayout;
  structure: Structure;
  responsive: ResponsiveLayout;
  hidden: Set<string>;
  /** Visible blocks in reading order: the numbers of the wireframe. */
  visible: string[];
  /** Host block → the blocks it absorbed, by position. */
  absorbed: Map<string, string[]>;
  /** Block → the screen it links to: its own `linkTo`, else the first absorbed block's (the page's links). */
  links: Map<string, string>;
}

function factsOf(screen: Screen): ScreenFacts {
  const absorb = absorbChildren(screen.layout);
  const layout = absorb.layout;
  const structure = inferStructure(layout);
  const responsive = deriveResponsive(layout, structure);
  const hidden = hiddenBlocks(layout);
  const visible = structure.order.filter((id) => Object.hasOwn(layout.blocks, id) && !hidden.has(id));
  const byPosition = (a: string, b: string) => {
    const ra = screen.layout.blocks[a]!.rect;
    const rb = screen.layout.blocks[b]!.rect;
    return ra.row - rb.row || ra.col - rb.col || (a < b ? -1 : a > b ? 1 : 0);
  };
  const absorbed = new Map<string, string[]>();
  const links = new Map<string, string>();
  for (const [id, block] of Object.entries(layout.blocks)) if (block.linkTo !== undefined) links.set(id, block.linkTo);
  for (const child of Object.keys(absorb.absorbed).sort(byPosition)) {
    const host = absorb.absorbed[child]!;
    absorbed.set(host, [...(absorbed.get(host) ?? []), child]);
    const to = screen.layout.blocks[child]!.linkTo;
    if (to !== undefined && !links.has(host)) links.set(host, to);
  }
  return { screen, layout, structure, responsive, hidden, visible, absorbed, links };
}

const labelOf = (screen: Screen, id: string) => plainText(screen.layout.blocks[id]?.label ?? id);

function flowLines(doc: DesignDoc, all: readonly ScreenFacts[], L: LayoutCopy, locale: Locale): string[] {
  const nameOf = (id: string) => (Object.hasOwn(doc.screens, id) ? doc.screens[id]!.name : id);
  const quote = locale === "es" ? guillemets : straight;
  const out = [`### ${L.flowTitle}`, "", L.flowIntro, ""];
  all.forEach(({ screen }, i) => {
    const parts = [`${i + 1}. ${plainText(screen.name)} (\`${screen.route}\`)`, L.kinds[screen.kind]];
    if (screen.shell) parts.push(L.navLine(L.nav[screen.shell.nav]), L.header(screen.shell.header));
    out.push(parts.join(" · "));
  });
  out.push("", L.linksTitle, "");
  const links: string[] = [];
  for (const { screen, visible, links: linksOf } of all) {
    const targets = visible.flatMap((id) => {
      const to = linksOf.get(id);
      return to !== undefined && Object.hasOwn(doc.screens, to) ? [`${quote(nameOf(to))} (${L.linkFrom(labelOf(screen, id))})`] : [];
    });
    if (targets.length > 0) links.push(`- ${plainText(screen.name)} → ${targets.join(" · ")}`);
  }
  const navScreens = all.filter(({ screen }) => screen.kind === "app" && screen.shell && screen.shell.nav !== "none");
  if (navScreens.length > 0) {
    const nav = navScreens[0]!.screen.shell!.nav;
    links.push(`- ${L.sharedNav(L.nav[nav], navScreens.map(({ screen }) => plainText(screen.name)).join(", "))}`);
  }
  out.push(...(links.length > 0 ? links : [L.noLinks]), "");
  return out;
}

function readingOrderLines(doc: DesignDoc, facts: ScreenFacts, L: LayoutCopy, locale: Locale): string[] {
  const { screen, layout, visible } = facts;
  return visible.map((id, i) => {
    const block = layout.blocks[id]!;
    const element = screen.page.elements[id];
    let target: string;
    if (element) {
      const variant = typeof element.props.variant === "string" && element.props.variant ? `@${plainText(element.props.variant)}` : "";
      target = `\`${element.type}${variant}\``;
    } else {
      target = `\`${isLibraryBlockType(block.type) ? getBlockDef(block.type).sectionType : block.type}\``;
    }
    const count = block.count !== undefined ? ` ×${block.count}` : "";
    const inside = facts.absorbed.get(id);
    const holds = inside ? ` (${L.absorbs(nameList(inside.map((child) => labelOf(screen, child)), locale))})` : "";
    const note = block.note ? ` — ${L.note(quoted(block.note))}` : "";
    const to = facts.links.get(id);
    const link = to !== undefined && Object.hasOwn(doc.screens, to) ? ` → ${L.linksTo(plainText(doc.screens[to]!.name))}` : "";
    return `${i + 1}. ${labelOf(screen, id)} → ${target}${count}${holds}${note}${link}`;
  });
}

function tabletLine(facts: ScreenFacts, L: LayoutCopy, locale: Locale): string {
  const { screen, structure, responsive, hidden } = facts;
  const plans = responsive.tablet.nodes;
  const parts: string[] = [];
  for (const node of regionsOf(structure)) {
    const plan = plans[node.id];
    if (!plan || node.kind === "block" || node.kind === "stack") continue;
    const groups =
      node.kind === "row"
        ? node.children.map((child) => blocksUnder(child.node, hidden))
        : node.items.map((item) => blocksUnder(item.node, hidden));
    const visibleGroups = groups.filter((group) => group.length > 0);
    if (visibleGroups.length < 2) continue;
    const names = nameList(visibleGroups.map((group) => group.map((id) => labelOf(screen, id)).join(" + ")), locale);
    if (node.kind === "row") {
      if (plan.mode === "keep") {
        const spans = groups.flatMap((group, k) => (group.length > 0 ? [plan.spans[k]!] : []));
        parts.push(L.rowKeep(names, spans.join(" + ")));
      } else parts.push(L.rowWrap(names));
    } else parts.push(plan.mode === "keep" ? L.gridKeep(names) : L.gridStack(names));
  }
  if (screen.shell?.nav === "sidebar") parts.push(L.sidebarToRail);
  const hiddenHere = facts.visible.filter((id) => responsive.tablet.blocks[id]?.hidden);
  if (hiddenHere.length > 0) parts.push(L.hiddenOn(nameList(hiddenHere.map((id) => labelOf(screen, id)), locale)));
  return `- ${L.tablet}: ${parts.length > 0 ? parts.join("; ") : L.tabletSame}.`;
}

function mobileLine(facts: ScreenFacts, L: LayoutCopy, locale: Locale): string {
  const { screen, responsive } = facts;
  const quote = locale === "es" ? guillemets : straight;
  const parts = [L.mobileBase];
  if (screen.shell && screen.shell.nav !== "none") parts.push(L.navToTopBar);
  const hiddenHere: string[] = [];
  for (const id of facts.visible) {
    const derived = responsive.mobile.blocks[id];
    if (!derived) continue;
    if (derived.hidden) hiddenHere.push(labelOf(screen, id));
    else if (derived.behavior !== "stack") parts.push(`${quote(labelOf(screen, id))} → ${L.behaviors[derived.behavior]}`);
  }
  if (hiddenHere.length > 0) parts.push(L.hiddenOn(nameList(hiddenHere, locale)));
  return `- ${L.mobile}: ${parts.join("; ")}.`;
}

function gridLines(facts: ScreenFacts, L: LayoutCopy, locale: Locale): string[] {
  const { screen, structure, visible } = facts;
  const number = new Map(visible.map((id, i) => [id, i + 1]));
  const out: string[] = [];
  for (const node of regionsOf(structure)) {
    if (node.kind !== "grid") continue;
    const ids = node.items.flatMap((item) => (item.node.kind === "block" ? [item.node.id] : []));
    if (!node.areas) {
      out.push(`- ${L.gridOverlap(nameList(ids.map((id) => labelOf(screen, id)), locale))}.`);
      continue;
    }
    const legend = ids
      .map((id) => {
        const n = number.get(id);
        return `${areaName(id)} = ${n !== undefined ? `${n}. ` : ""}${labelOf(screen, id)}`;
      })
      .join(" · ");
    out.push(`- ${L.grid(node.areas.map((row) => `"${row}"`).join(" "), legend)}.`);
  }
  return out;
}

/** The layout of one screen with the backticks taken out of labels and notes (they go inside a fence). */
function fenceSafe(layout: ScreenLayout): ScreenLayout {
  const blocks: ScreenLayout["blocks"] = {};
  for (const [id, block] of Object.entries(layout.blocks)) {
    const note = block.note === undefined ? undefined : plainText(block.note);
    blocks[id] = { ...block, label: plainText(block.label), ...(block.note !== undefined && { note }) };
  }
  return { ...layout, blocks };
}

function screenLines(doc: DesignDoc, facts: ScreenFacts, L: LayoutCopy, locale: Locale): string[] {
  const { screen, layout, structure, responsive } = facts;
  const out = [`### ${plainText(screen.name)} (\`${screen.route}\`)`, ""];
  const head = [L.kinds[screen.kind]];
  if (screen.shell) head.push(L.navLine(L.nav[screen.shell.nav]), L.header(screen.shell.header));
  out.push(`${head.join(" · ")}.`, "");
  const wireframe = toAsciiWireframe(fenceSafe(layout), { width: WIREFRAME_WIDTH, numbered: true, structure, responsive });
  if (!wireframe) {
    out.push(L.empty, "");
    return out;
  }
  out.push("```text", wireframe, "```", "", L.readingOrder, "", ...readingOrderLines(doc, facts, L, locale), "");
  const hiddenIds = structure.order.filter((id) => facts.hidden.has(id));
  if (hiddenIds.length > 0) out.push(L.hiddenBlocks(nameList(hiddenIds.map((id) => labelOf(screen, id)), locale)), "");
  out.push(tabletLine(facts, L, locale), mobileLine(facts, L, locale), ...gridLines(facts, L, locale), "");
  return out;
}

/**
 * The «Pantallas y flujo» block of DESIGN.md (inside «## Layout») and of the prompt packs: the screens in
 * order with their routes and links, then one `### {name} (\`/route\`)` per screen with its ASCII wireframe,
 * numbered reading order (section type@variant, ×N, absorbed blocks, note, link), tablet and phone rules and
 * the `grid-template-areas` of regions without a clean cut. The wireframe and the numbers follow the layout as
 * the page is built (absorbed blocks inside their host's line, not as boxes). `files` (DESIGN.md) adds a line
 * on each screen's `layout.css` and `layout.json` in the code pack. Empty for documents without screens.
 * Deterministic.
 */
export function screensLayoutLines(doc: DesignDoc, locale: Locale, options: { files?: boolean } = {}): string[] {
  const screens = orderedScreens(doc);
  if (screens.length === 0) return [];
  const L = COPY[locale];
  const all = screens.map(factsOf);
  const flow = flowLines(doc, all, L, locale);
  if (options.files) flow.splice(flow.indexOf(L.flowIntro) + 2, 0, L.files, "");
  return [...flow, ...all.flatMap((facts) => screenLines(doc, facts, L, locale))];
}

/** What a prompt pack builds when there are screens: «Inicio, Precios y Dashboard» / "Home, Pricing and Dashboard screens". */
export function screenNames(doc: DesignDoc, locale: Locale): string {
  const names = orderedScreens(doc).map((screen) => plainText(screen.name));
  const shown = names.slice(0, TASK_NAMES);
  const rest = names.length - shown.length;
  const list =
    rest > 0
      ? `${shown.join(", ")} (+${rest})`
      : shown.length > 1
        ? `${shown.slice(0, -1).join(", ")} ${COPY[locale].and} ${shown[shown.length - 1]}`
        : (shown[0] ?? "");
  return locale === "es" ? list : `${list} ${names.length === 1 ? "screen" : "screens"}`;
}
