import { defaultLandingLayout, getLandingLayout, type OutputKind } from "@dialmade/catalog";
import {
  DEFAULT_LAYOUT_IDS,
  DesignDocError,
  LAYOUT_PAGE_ID,
  PAGE_DIAL_DEFAULTS,
  PageSchema,
  ROOT_ELEMENT_ID,
  addPage,
  elementIdBase,
  type DesignDoc,
  type Page,
  type PageElement,
} from "@dialmade/doc";
import { APP_SHELL_TYPE, APP_SHELL_WIDGETS, BRAND_BOARD_SECTIONS, pageRootType } from "./constants";
import { contentContextFromDoc, type ContentContextOptions } from "./context";
import { storedDefaultProps } from "./props";
import { sectionRegistry, type SectionRegistry } from "./registry";
import type { ContentContext } from "./types";

/** A section of the default tree; `children` only for containers. */
export interface SectionSpec {
  type: string;
  children?: readonly SectionSpec[];
}

export interface BuildPageOptions {
  registry?: SectionRegistry;
}

function landingLayoutId(ctx: ContentContext, layoutId?: string): string {
  if (layoutId === undefined) return defaultLandingLayout(ctx.productType.id).id;
  if (layoutId === LAYOUT_PAGE_ID) throw new DesignDocError(`Pages with layoutId "${LAYOUT_PAGE_ID}" come from a layout: use buildPageFromLayout`);
  if (!getLandingLayout(layoutId)) throw new DesignDocError(`Unknown landing layout "${layoutId}"`);
  return layoutId;
}

/** The default section tree of a page, before ids and props. */
export function defaultSectionSpecs(
  kind: OutputKind,
  ctx: ContentContext,
  layoutId?: string,
  registry: SectionRegistry = sectionRegistry,
): SectionSpec[] {
  if (kind === "landing") {
    return (getLandingLayout(landingLayoutId(ctx, layoutId))?.sections ?? []).map((type) => ({ type }));
  }
  if (kind === "brand") return BRAND_BOARD_SECTIONS.map((type) => ({ type }));
  const widgets = registry.get(APP_SHELL_TYPE)?.defaultChildren ?? APP_SHELL_WIDGETS;
  return [{ type: APP_SHELL_TYPE, children: widgets.map((type) => ({ type })) }];
}

/**
 * A complete page for the DesignDoc: `${kind}.page` root and the default sections of the kind
 * (landing: the layout's sections; brand: the full board; app: `app.shell` with its widgets), each
 * one with its variant and default props (brand texts as bindings). Ids follow @dialmade/doc (`hero-1`).
 * Unregistered sections are kept with empty props. Throws `DesignDocError`.
 */
export function buildDefaultPage(
  kind: OutputKind,
  ctx: ContentContext,
  layoutId?: string,
  options: BuildPageOptions = {},
): Page {
  const registry = options.registry ?? sectionRegistry;
  if (layoutId === LAYOUT_PAGE_ID) throw new DesignDocError(`Pages with layoutId "${LAYOUT_PAGE_ID}" come from a layout: use buildPageFromLayout`);
  const resolvedLayoutId = kind === "landing" ? landingLayoutId(ctx, layoutId) : (layoutId ?? DEFAULT_LAYOUT_IDS[kind]);
  const elements: Record<string, PageElement> = {};
  const counts = new Map<string, number>();

  const propsFor = (type: string) => {
    const def = registry.get(type);
    return def ? storedDefaultProps(def, ctx) : {};
  };
  const nextId = (type: string) => {
    const base = elementIdBase(type);
    let n = counts.get(base) ?? 0;
    let id: string;
    do {
      n += 1;
      id = `${base}-${n}`;
    } while (id in elements || id === ROOT_ELEMENT_ID);
    counts.set(base, n);
    return id;
  };
  const add = (spec: SectionSpec): string => {
    const id = nextId(spec.type);
    const element: PageElement = { type: spec.type, props: propsFor(spec.type), children: [] };
    elements[id] = element;
    element.children = (spec.children ?? []).map(add);
    return id;
  };

  const rootType = pageRootType(kind);
  const children = defaultSectionSpecs(kind, ctx, resolvedLayoutId, registry).map(add);
  const dials = PAGE_DIAL_DEFAULTS[kind];
  const page = {
    kind,
    layoutId: resolvedLayoutId,
    ...(Object.keys(dials).length > 0 && { dials: { ...dials } }),
    root: ROOT_ELEMENT_ID,
    elements: { [ROOT_ELEMENT_ID]: { type: rootType, props: propsFor(rootType), children }, ...elements },
  };
  const parsed = PageSchema.safeParse(page);
  if (!parsed.success) throw new DesignDocError(`Invalid ${kind} page`, parsed.error.issues);
  return parsed.data;
}

export interface AddDefaultPageOptions extends ContentContextOptions, BuildPageOptions {
  layoutId?: string;
  replace?: boolean;
}

/** `addPage(doc, kind, buildDefaultPage(…))` with the content context taken from the doc. */
export function addDefaultPage(doc: DesignDoc, kind: OutputKind, options: AddDefaultPageOptions = {}): DesignDoc {
  const { layoutId, replace, registry, ...contentOptions } = options;
  const page = buildDefaultPage(kind, contentContextFromDoc(doc, contentOptions), layoutId, { ...(registry && { registry }) });
  return addPage(doc, kind, page, { ...(replace !== undefined && { replace }) });
}
