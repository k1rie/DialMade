import { sectionRegistry, type SectionRegistry } from "./registry";

/**
 * The stored props of an element as its section shows them (`SectionDefinition.visible`): repeatable lists
 * cut to `count`, copy hidden by a flag removed. Bindings stay unresolved. Unknown types and sections
 * without the hook return a shallow copy of the props. For descriptions of a page (the `visibleProps`
 * export option of @dialmade/doc, the AI copy collector), never for rendering.
 */
export function visibleProps(
  element: { readonly type: string; readonly props: Readonly<Record<string, unknown>> },
  registry: SectionRegistry = sectionRegistry,
): Record<string, unknown> {
  const def = registry.get(element.type);
  return def?.visible ? def.visible(element.props) : { ...element.props };
}
