import type { SectionDefinition } from "./types";

/** Identity helper that keeps the props type of a section while authoring it. */
export function defineSection<P extends object>(definition: SectionDefinition<P>): SectionDefinition<P> {
  return definition;
}
