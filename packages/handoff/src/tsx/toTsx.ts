// Design tree → React + Tailwind v4 source. One component per section (`src/sections/<screen>/<Name>.tsx`), one
// page per screen (`src/screens/<Name>Screen.tsx`) that lays the sections out like the layout does (12-column
// grids that stack on phones through container queries), an `Icon` component with the icons in use and
// `dialmade.css` with the theme. Links between screens are plain `<a href="/route">`. Deterministic.
import { ICONS } from "@dialmade/ui";
import { resolveExport, type DesignDoc } from "@dialmade/doc";
import { buildDesignTree, type DesignTreeOptions } from "../tree/build";
import type { DesignNode, DesignPage, DesignTree, FrameNode, ShapeNode, TextNode } from "../tree/types";
import { boxClasses, isOverlay, layoutClasses, paddingClasses, textClasses, type Parent } from "./classes";
import { tsxCss } from "./css";

export type TsxOptions = DesignTreeOptions;

/** Files of the export, path → content. Paths are relative to the export's root folder. */
export type TsxFiles = Record<string, string>;

const INDENT = "  ";

/** «Inicio» → `Inicio`, «app.kpiRow» → `KpiRow`; never empty and never starting with a digit. */
export function pascal(value: string, fallback = "Section"): string {
  const words = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const name = words.map((word) => word[0]!.toUpperCase() + word.slice(1)).join("");
  if (!name) return fallback;
  return /^[0-9]/.test(name) ? `${fallback}${name}` : name;
}

const slug = (value: string) => pascal(value).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** A JSX text child: plain when safe, a string expression otherwise. */
function jsxText(value: string): string {
  return /^[^{}<>&"'`\n\\]*$/.test(value) && value.trim() === value ? value : `{${JSON.stringify(value)}}`;
}

const attr = (value: string) => JSON.stringify(value);

function classAttr(classes: readonly string[]): string {
  const unique = [...new Set(classes.filter(Boolean))];
  return unique.length ? ` className=${attr(unique.join(" "))}` : "";
}

type Emit = {
  /** Screen id → route (`/precios`), for links. */
  routes: ReadonlyMap<string, string>;
  icons: Set<string>;
  /** Section component of each section frame (by identity) while emitting a page. */
  components: Map<FrameNode, SectionComponent>;
  /** HTML context of the node being written, so the markup stays valid (the HTML parser repairs invalid nesting). */
  inList: boolean;
  inInteractive: boolean;
};

type SectionComponent = { name: string; file: string; node: FrameNode; hasSlot: boolean };

const parentOf = (node: FrameNode): Parent => {
  const layout = node.layout ?? { kind: "flex", direction: "column" };
  if (isOverlay(node)) return "overlay";
  return layout.kind === "flex" ? (layout.direction === "row" ? "row" : "column") : layout.kind;
};

const HEADING_TAG: Partial<Record<TextNode["style"], string>> = { display: "h1", h1: "h2", h2: "h2", h3: "h3" };

function textJsx(e: Emit, node: TextNode, parent: Parent, depth: number): string {
  let tag: string = node.tag ?? HEADING_TAG[node.style] ?? (parent === "row" ? "span" : "p");
  // Cells only exist inside a real <table>; the tree's tables are ARIA tables of boxes.
  if (tag === "th" || tag === "td") tag = "span";
  if (e.inList) tag = "li";
  else if (e.inInteractive && tag !== "span" && tag !== "strong" && tag !== "small" && tag !== "code") tag = "span";
  return `${INDENT.repeat(depth)}<${tag}${classAttr(textClasses(node, parent))}>${jsxText(node.text)}</${tag}>`;
}

function shapeJsx(node: ShapeNode, parent: Parent, depth: number): string {
  const classes = [...boxClasses(node, parent), ...(node.shape === "ellipse" ? ["rounded-full"] : [])];
  if (typeof node.width === "number" || typeof node.height === "number") classes.push("shrink-0");
  const a11y = node.role === "image" && node.label ? ` role="img" aria-label=${attr(node.label)}` : ' aria-hidden="true"';
  return `${INDENT.repeat(depth)}<div${a11y}${classAttr(classes)} />`;
}

function iconJsx(e: Emit, node: Extract<DesignNode, { type: "icon" }>, depth: number): string {
  const name = Object.hasOwn(ICONS, node.name) ? node.name : "more";
  e.icons.add(name);
  const size = node.size ?? 16;
  return `${INDENT.repeat(depth)}<Icon name=${attr(name)}${classAttr([`size-[${size}px]`, "shrink-0", `text-${node.color.startsWith("color-") ? `(--${node.color})` : node.color}`])} />`;
}

/** The element of a box: its semantic tag, made valid where it sits (no nested links, no `<div>` in a `<table>`). */
function frameTag(e: Emit, node: FrameNode): { tag: string; extra: string; interactive: boolean } {
  if (e.inList) return { tag: "li", extra: "", interactive: false };
  const wanted = node.linkTo !== undefined ? "a" : (node.tag ?? "div");
  if ((wanted === "a" || wanted === "button") && e.inInteractive) return { tag: "span", extra: "", interactive: false };
  if (wanted === "a" && node.linkTo === undefined) return { tag: "a", extra: ' href="#"', interactive: true };
  if (wanted === "a") return { tag: "a", extra: "", interactive: true };
  if (wanted === "button") return { tag: "button", extra: ' type="button"', interactive: true };
  if (wanted === "table") return { tag: "div", extra: ' role="table"', interactive: false };
  if (wanted === "dialog") return { tag: "div", extra: ' role="dialog"', interactive: false };
  if (wanted === "li") return { tag: "div", extra: ' role="listitem"', interactive: false };
  return { tag: wanted, extra: "", interactive: false };
}

function frameJsx(e: Emit, node: FrameNode, parent: Parent, depth: number, inSection: SectionComponent | null, extraClasses: readonly string[] = []): string {
  const pad = INDENT.repeat(depth);
  const component = e.components.get(node);
  if (component && component !== inSection) {
    const place = [...boxClasses({ ...node, fill: undefined, stroke: undefined, radius: undefined, shadow: undefined, opacity: undefined, maxWidth: undefined, aspect: undefined, minHeight: undefined }, parent)];
    const placement = place.length ? ` className=${attr([...new Set(place)].join(" "))}` : "";
    if (!component.hasSlot) return `${pad}<${component.name}${placement} />`;
    const slots = slotChildren(node);
    const inner = slots.map((child) => nodeJsx(e, child, "column", depth + 1, null)).join("\n");
    return `${pad}<${component.name}${placement}>\n${inner}\n${pad}</${component.name}>`;
  }
  const { tag, extra, interactive } = frameTag(e, node);
  const href = node.linkTo !== undefined && tag === "a" ? ` href=${attr(e.routes.get(node.linkTo) ?? "#")}` : "";
  const label = node.label ? ` aria-label=${attr(node.label)}` : "";
  const hasAbsolute = node.children.some((child) => child.type === "frame" && child.absolute);
  const root = component === inSection && inSection !== null && node === inSection.node;
  const classes = [
    ...layoutClasses(node),
    ...boxClasses(node, parent),
    ...paddingClasses(node.padding),
    ...extraClasses,
    ...(node.clip ? ["overflow-hidden"] : []),
    ...(node.mode ? [node.mode] : []),
    ...(hasAbsolute ? ["relative"] : []),
    ...(root ? ["{className}"] : []),
  ];
  const own = parentOf(node);
  const childLines: string[] = [];
  let slotDone = false;
  const saved = { inList: e.inList, inInteractive: e.inInteractive };
  e.inList = tag === "ul" || tag === "ol";
  e.inInteractive = saved.inInteractive || interactive;
  for (const child of node.children) {
    if (inSection && child.type === "frame" && child.slot) {
      if (!slotDone) childLines.push(`${INDENT.repeat(depth + 1)}{children}`);
      slotDone = true;
      continue;
    }
    childLines.push(nodeJsx(e, child, own, depth + 1, inSection));
  }
  e.inList = saved.inList;
  e.inInteractive = saved.inInteractive;
  const classText = root ? rootClassAttr(classes) : classAttr(classes);
  const open = `${pad}<${tag}${extra}${href}${label}${classText}`;
  if (childLines.length === 0) return `${open} />`;
  return `${open}>\n${childLines.join("\n")}\n${pad}</${tag}>`;
}

/** The section root merges the placement its page passes in (`className`). */
function rootClassAttr(classes: readonly string[]): string {
  const own = [...new Set(classes.filter((value) => value && value !== "{className}"))].join(" ");
  return ` className={[${attr(own)}, className].filter(Boolean).join(" ")}`;
}

function slotChildren(node: FrameNode): DesignNode[] {
  const out: DesignNode[] = [];
  const visit = (current: FrameNode) => {
    for (const child of current.children) {
      if (child.type === "frame" && child.slot) out.push(child);
      else if (child.type === "frame" && !child.section) visit(child);
    }
  };
  visit(node);
  return out;
}

function nodeJsx(e: Emit, node: DesignNode, parent: Parent, depth: number, inSection: SectionComponent | null): string {
  switch (node.type) {
    case "frame":
      return frameJsx(e, node, parent, depth, inSection);
    case "text":
      return textJsx(e, node, parent, depth);
    case "shape":
      return shapeJsx(node, parent, depth);
    case "icon":
      return iconJsx(e, node, depth);
  }
}

/** Section frames of a page (outermost first), each with a unique component name. */
function collectSections(page: DesignPage, taken: Set<string>, prefix: string): SectionComponent[] {
  const out: SectionComponent[] = [];
  const visit = (node: DesignNode) => {
    if (node.type !== "frame") return;
    if (node.section) {
      const base = `${prefix}${pascal(node.section.split(".").pop() ?? node.section)}`;
      let name = base;
      for (let n = 2; taken.has(name); n++) name = `${base}${n}`;
      taken.add(name);
      out.push({ name, file: "", node, hasSlot: slotChildren(node).length > 0 });
    }
    node.children.forEach(visit);
  };
  visit(page.root);
  return out;
}

function sectionFile(e: Emit, component: SectionComponent, iconImport: string): string {
  const { node, name, hasSlot } = component;
  const props = hasSlot ? "{ className, children }: { className?: string; children?: ReactNode }" : "{ className }: { className?: string }";
  const body = frameJsx(e, node, "column", 2, component);
  const usesIcon = body.includes("<Icon ");
  const imports = [
    ...(hasSlot ? ['import type { ReactNode } from "react";'] : []),
    ...(usesIcon ? [`import { Icon } from "${iconImport}";`] : []),
  ];
  return [
    `// ${node.name} · ${node.section}${node.key ? ` (${node.key})` : ""}. Generated by Dialmade.`,
    ...imports,
    ...(imports.length ? [""] : []),
    `export function ${name}(${props}) {`,
    `${INDENT}return (`,
    body,
    `${INDENT});`,
    "}",
    "",
  ].join("\n");
}

function screenFile(e: Emit, page: DesignPage, name: string, sections: SectionComponent[], dir: string): string {
  const body = frameJsx(e, page.root, "root", 2, null, ["@container", "min-h-screen"]);
  const usesIcon = body.includes("<Icon ");
  const used = sections.filter((component) => body.includes(`<${component.name}`));
  const imports = [
    ...used.map((component) => `import { ${component.name} } from "../sections/${dir}/${component.name}";`),
    ...(usesIcon ? ['import { Icon } from "../components/Icon";'] : []),
  ];
  return [
    `// ${page.name}${page.route ? ` (${page.route})` : ""}. Generated by Dialmade: one component per section in ../sections/${dir}.`,
    ...imports,
    "",
    `export default function ${name}() {`,
    `${INDENT}return (`,
    body,
    `${INDENT});`,
    "}",
    "",
  ].join("\n");
}

function iconFile(names: readonly string[]): string {
  const entries = names.map((name) => `  ${JSON.stringify(name)}: ${JSON.stringify((ICONS as Record<string, readonly string[]>)[name] ?? [])},`);
  return [
    "// Icons of @dialmade/ui used by the exported screens: 24×24 strokes in currentColor.",
    'import type { SVGProps } from "react";',
    "",
    `export type IconName = ${names.map((name) => JSON.stringify(name)).join(" | ")};`,
    "",
    "const ICONS: Record<IconName, readonly string[]> = {",
    ...entries,
    "};",
    "",
    'export function Icon({ name, ...props }: { name: IconName } & Omit<SVGProps<SVGSVGElement>, "name">) {',
    "  return (",
    '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>',
    "      {ICONS[name].map((d) => (",
    "        <path key={d} d={d} />",
    "      ))}",
    "    </svg>",
    "  );",
    "}",
    "",
  ].join("\n");
}

function readme(tree: DesignTree, screens: { page: DesignPage; name: string; file: string }[]): string {
  const es = tree.locale === "es";
  const rows = screens.map(({ page, file }) => `| ${page.name} | ${page.route ?? "—"} | \`${file}\` |`);
  return [
    `# ${tree.name} · ${es ? "Código (TSX)" : "Code (TSX)"}`,
    "",
    es
      ? "Componentes React + Tailwind v4 generados por Dialmade: un componente por sección y una página por pantalla. Usan las variables CSS del tema (el contrato de `@dialmade/ui`), así que cambiar `dialmade.css` cambia todo."
      : "React + Tailwind v4 components generated by Dialmade: one component per section and one page per screen. They use the theme's CSS variables (the `@dialmade/ui` contract), so changing `dialmade.css` changes everything.",
    "",
    es ? "## Cómo usarlo" : "## How to use it",
    "",
    es ? "1. Copia `src/` en tu proyecto (React 19 y Tailwind CSS v4)." : "1. Copy `src/` into your project (React 19 and Tailwind CSS v4).",
    es
      ? "2. Importa `src/dialmade.css` desde tu CSS de entrada (ya incluye `@import \"tailwindcss\"`)."
      : "2. Import `src/dialmade.css` from your entry CSS (it already includes `@import \"tailwindcss\"`).",
    es
      ? "3. Monta cada pantalla en su ruta. Con Next.js App Router: `app/precios/page.tsx` → `export { default } from \"@/screens/PreciosScreen\";`."
      : "3. Mount each screen at its route. With the Next.js App Router: `app/pricing/page.tsx` → `export { default } from \"@/screens/PricingScreen\";`.",
    es ? "4. Modo oscuro: añade la clase `dark` a `<html>`." : "4. Dark mode: add the `dark` class to `<html>`.",
    "",
    es ? "## Pantallas" : "## Screens",
    "",
    `| ${es ? "Pantalla" : "Screen"} | ${es ? "Ruta" : "Route"} | ${es ? "Archivo" : "File"} |`,
    "| --- | --- | --- |",
    ...rows,
    "",
    es
      ? "Las imágenes son marcadores (degradados con `role=\"img\"`): cámbialos por tus fotos. Los textos son los de tu diseño."
      : "Images are placeholders (gradients with `role=\"img\"`): swap them for your photos. The copy is your design's.",
    "",
  ].join("\n");
}

/** The TSX files of a design tree. */
export function filesFromTree(doc: DesignDoc, tree: DesignTree, options: TsxOptions = {}): TsxFiles {
  const routes = new Map(tree.pages.filter((page) => page.route !== undefined).map((page) => [page.id, page.route!]));
  const e: Emit = { routes, icons: new Set(), components: new Map(), inList: false, inInteractive: false };
  const files: TsxFiles = {};
  const taken = new Set<string>(["Icon"]);
  const screens: { page: DesignPage; name: string; file: string }[] = [];
  const screenNames = new Set<string>();

  for (const page of tree.pages) {
    const base = `${pascal(page.name, "Page")}Screen`;
    let name = base;
    for (let n = 2; screenNames.has(name) || taken.has(name); n++) name = `${base}${n}`;
    screenNames.add(name);
    taken.add(name);
    const dir = slug(name.replace(/Screen$/, "")) || "page";
    const sections = collectSections(page, taken, pascal(page.name, "Page"));
    for (const component of sections) {
      component.file = `src/sections/${dir}/${component.name}.tsx`;
      e.components.set(component.node, component);
    }
    for (const component of sections) files[component.file] = sectionFile(e, component, "../../components/Icon");
    const file = `src/screens/${name}.tsx`;
    files[file] = screenFile(e, page, name, sections, dir);
    screens.push({ page, name, file });
  }

  if (e.icons.size > 0) files["src/components/Icon.tsx"] = iconFile([...e.icons].sort());
  files["src/dialmade.css"] = tsxCss(doc, { ...options, bodyWeight: resolveExport(doc, options).light.bodyWeight });
  files["src/index.ts"] =
    screens.map(({ name }) => `export { default as ${name} } from "./screens/${name}";`).join("\n") + "\n";
  files["README.md"] = readme(tree, screens);
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** React + Tailwind v4 code of a document: its screens (or legacy pages) and its style guide. */
export function toTsx(doc: DesignDoc, options: TsxOptions = {}): TsxFiles {
  return filesFromTree(doc, buildDesignTree(doc, options), options);
}
