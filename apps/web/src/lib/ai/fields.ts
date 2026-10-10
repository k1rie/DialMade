import type { OutputKind } from "@dialmade/catalog";
import { isBinding, type DesignDoc, type Page } from "@dialmade/doc";
import {
  VARIANT_PROP,
  contentContextFromDoc,
  resolveSectionProps,
  sectionRegistry,
  type AnySectionDefinition,
  type SectionRegistry,
} from "@dialmade/sections";
import { MAX_COPY_FIELDS } from "./config";

/** One piece of text the model may rewrite. `pointer` is the RFC 6902 path in the DesignDoc. */
export type CopyField = {
  /** Short id the model answers with («f12»). */
  id: string;
  /** Element of the page (`hero-1`), or `null` for the brand tagline. */
  elementId: string | null;
  sectionType: string | null;
  /** Path inside the element's props (`["items", "2", "title"]`), or `["tagline"]` for the brand. */
  path: readonly string[];
  pointer: string;
  op: "replace" | "add";
  current: string;
  maxLength: number;
};

/**
 * Keys that are data, identity or configuration, never copy: links, icons, enums, numbers shown as
 * text, people and company names (the model must not invent real ones) and table rows.
 */
const SKIP_KEYS = new Set([
  VARIANT_PROP,
  "id",
  "key",
  "href",
  "url",
  "src",
  "icon",
  "kind",
  "align",
  "tone",
  "format",
  "email",
  "initials",
  "activeId",
  "value",
  "display",
  "time",
  "language",
  "timezone",
  "name",
  "actor",
  "company",
  "role",
  "workspace",
  "subject",
  "logos",
  "names",
  "rows",
  "cells",
  "categories",
  "trend",
]);

const MIN_TEXT = 2;
const MAX_TEXT = 600;
const BRAND_TAGLINE_MAX = 200;

const escapePointer = (segment: string) => segment.replace(/~/g, "~0").replace(/\//g, "~1");
export const toPointer = (segments: readonly string[]) => `/${segments.map(escapePointer).join("/")}`;

/** A field may grow to about twice its length (short labels get some room). */
export const maxLengthFor = (current: string) => Math.min(MAX_TEXT, Math.max(48, Math.ceil(current.length * 2)));

function getAt(value: unknown, path: readonly string[]): unknown {
  let node = value;
  for (const segment of path) {
    if (Array.isArray(node)) node = node[Number(segment)];
    else if (node && typeof node === "object") node = (node as Record<string, unknown>)[segment];
    else return undefined;
  }
  return node;
}

function withValueAt(value: unknown, path: readonly string[], next: unknown): unknown {
  if (path.length === 0) return next;
  const [head, ...rest] = path as [string, ...string[]];
  if (Array.isArray(value)) {
    const copy = value.slice();
    copy[Number(head)] = withValueAt(copy[Number(head)], rest, next);
    return copy;
  }
  const record = (value ?? {}) as Record<string, unknown>;
  return { ...record, [head]: withValueAt(record[head], rest, next) };
}

/** Same length, different text: an enum or a pattern rejects it, a free-text prop accepts it. */
function probeFor(text: string): string {
  const reversed = [...text].reverse().join("");
  return reversed !== text ? reversed : `${text.slice(1)}${text[0]}`;
}

/** True when the section schema accepts any text at `path` (so it is copy, not an enum or id). */
function isFreeText(def: AnySectionDefinition, props: Record<string, unknown>, path: readonly string[], text: string): boolean {
  if (typeof getAt(props, path) !== "string") return false;
  return def.schema.safeParse(withValueAt(props, path, probeFor(text))).success;
}

function* stringLeaves(value: unknown, path: string[] = []): Generator<{ path: string[]; text: string }> {
  if (typeof value === "string") {
    yield { path, text: value };
    return;
  }
  if (isBinding(value)) return;
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) yield* stringLeaves(item, [...path, String(index)]);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (SKIP_KEYS.has(key)) continue;
      yield* stringLeaves(item, [...path, key]);
    }
  }
}

/** Visible elements in render order (depth first), without the root and hidden subtrees. */
export function visibleElementIds(page: Page): string[] {
  const hidden = new Set(page.hidden ?? []);
  const out: string[] = [];
  const visit = (id: string) => {
    const element = page.elements[id];
    if (!element || hidden.has(id)) return;
    out.push(id);
    element.children.forEach(visit);
  };
  page.elements[page.root]?.children.forEach(visit);
  return out;
}

export type CollectCopyFieldsOptions = {
  /** Only these elements (default: every visible one). */
  sectionIds?: readonly string[];
  registry?: SectionRegistry;
  maxFields?: number;
};

/**
 * Text props of a page the AI may rewrite: string leaves the section schema accepts as free text,
 * minus bindings (`{ bind }`), data and identity keys. The brand tagline is offered when the whole
 * page is requested or a requested section binds it.
 */
export function collectCopyFields(doc: DesignDoc, kind: OutputKind, options: CollectCopyFieldsOptions = {}): CopyField[] {
  const page = doc.pages[kind];
  if (!page) return [];
  const registry = options.registry ?? sectionRegistry;
  const maxFields = options.maxFields ?? MAX_COPY_FIELDS;
  const ctx = contentContextFromDoc(doc, { locale: doc.brief.locale });
  const wanted = options.sectionIds ? new Set(options.sectionIds) : null;
  const ids = visibleElementIds(page).filter((id) => !wanted || wanted.has(id));

  const fields: CopyField[] = [];
  let offerTagline = !wanted;
  const push = (field: Omit<CopyField, "id">) => fields.push({ ...field, id: `f${fields.length + 1}` });

  for (const elementId of ids) {
    const element = page.elements[elementId]!;
    const def = registry.get(element.type);
    if (!def) continue;
    const bound = new Set(Object.keys(def.bindings ?? {}));
    if (Object.values(def.bindings ?? {}).includes("brand.tagline")) offerTagline = true;
    const { props } = resolveSectionProps(def, element.props, ctx);

    for (const [key, value] of Object.entries(element.props)) {
      if (bound.has(key) || SKIP_KEYS.has(key)) continue;
      for (const leaf of stringLeaves(value, [key])) {
        const text = leaf.text.trim();
        if (text.length < MIN_TEXT || text.length > MAX_TEXT) continue;
        if (!isFreeText(def, props, leaf.path, leaf.text)) continue;
        push({
          elementId,
          sectionType: element.type,
          path: leaf.path,
          pointer: toPointer(["pages", kind, "elements", elementId, "props", ...leaf.path]),
          op: "replace",
          current: leaf.text,
          maxLength: maxLengthFor(text),
        });
      }
    }
  }

  const fieldsToKeep = offerTagline ? maxFields - 1 : maxFields;
  fields.splice(fieldsToKeep);
  if (offerTagline) {
    push({
      elementId: null,
      sectionType: null,
      path: ["tagline"],
      pointer: "/brand/tagline",
      op: "add",
      current: doc.brand.tagline ?? "",
      maxLength: BRAND_TAGLINE_MAX,
    });
  }
  return fields;
}
