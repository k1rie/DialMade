import type { OutputKind } from "@dialmade/catalog";
import { appSections } from "./app";
import { brandSections } from "./brand";
import { landingSections } from "./landing";
import type { AnySectionDefinition } from "./types";
import { uiSections } from "./ui";

const ELEMENT_TYPE = /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/;

export interface SectionRegistry {
  get(type: string): AnySectionDefinition | undefined;
  /** Sections of one kind (all of them without `kind`), in registration order. */
  list(kind?: OutputKind): readonly AnySectionDefinition[];
  readonly size: number;
}

export class SectionRegistryError extends Error {
  override readonly name = "SectionRegistryError";

  constructor(readonly problems: readonly string[]) {
    super(`Invalid section registry: ${problems.join("; ")}`);
  }
}

/** Problems of a set of definitions (empty when valid). */
export function validateSections(definitions: readonly AnySectionDefinition[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const def of definitions) {
    const at = `"${def.type}"`;
    if (!ELEMENT_TYPE.test(def.type)) problems.push(`${at}: the type must be namespaced, e.g. "landing.hero"`);
    const namespace = def.type.split(".")[0];
    if (namespace !== def.kind && namespace !== "ui") problems.push(`${at}: namespace "${namespace}" does not match kind "${def.kind}"`);
    if (seen.has(def.type)) problems.push(`${at}: registered twice`);
    seen.add(def.type);

    if (def.variants.length === 0) problems.push(`${at}: needs at least one variant`);
    if (new Set(def.variants.map((v) => v.id)).size !== def.variants.length) problems.push(`${at}: variant ids must be unique`);

    const knobKeys = def.knobs.map((knob) => knob.key);
    if (new Set(knobKeys).size !== knobKeys.length) problems.push(`${at}: knob keys must be unique`);
    for (const knob of def.knobs) {
      if (knob.control === "select" && knob.key !== "variant" && !knob.options?.length) {
        problems.push(`${at}: select knob "${knob.key}" needs options`);
      }
      if (knob.control === "slider" && !(typeof knob.min === "number" && typeof knob.max === "number" && knob.min < knob.max)) {
        problems.push(`${at}: slider knob "${knob.key}" needs min < max`);
      }
    }
    if (!def.container && def.defaultChildren?.length) problems.push(`${at}: only containers declare defaultChildren`);
  }
  return problems;
}

/** Throws `SectionRegistryError` when the definitions are inconsistent. */
export function createRegistry(definitions: readonly AnySectionDefinition[]): SectionRegistry {
  const problems = validateSections(definitions);
  if (problems.length > 0) throw new SectionRegistryError(problems);
  const byType = new Map(definitions.map((def) => [def.type, def]));
  const byKind = new Map<OutputKind, AnySectionDefinition[]>();
  for (const def of definitions) byKind.set(def.kind, [...(byKind.get(def.kind) ?? []), def]);
  const all = [...definitions];
  return {
    get: (type) => byType.get(type),
    list: (kind) => (kind ? (byKind.get(kind) ?? []) : all),
    size: all.length,
  };
}

export const sectionRegistry: SectionRegistry = createRegistry([
  ...brandSections,
  ...landingSections,
  ...appSections,
  ...uiSections,
]);

export const getSection = (type: string): AnySectionDefinition | undefined => sectionRegistry.get(type);

export const listSections = (kind?: OutputKind): readonly AnySectionDefinition[] => sectionRegistry.list(kind);
