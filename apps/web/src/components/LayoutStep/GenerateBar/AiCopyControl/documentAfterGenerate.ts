// The document as «Generar» would write it now, shared by the «IA» control's details: the copy estimate must count
// the copy it will rewrite, and «Diseño con IA» prepares the BYOK estimate and the «mi Claude» prompt of the screens
// «Generar con IA» will design before they are written.
import type { DesignDoc } from "@dialmade/doc";
import { withGeneratedScreens, type GeneratedScreenInput } from "@/lib/design-engine";
import { getResponsive, getStructure } from "../../structureCache";
import type { Screen } from "../../types";

export function documentAfterGenerate(doc: DesignDoc, screens: Readonly<Record<string, Screen>>, order: readonly string[]): DesignDoc {
  const inputs: GeneratedScreenInput[] = order.flatMap((id) => {
    const screen = screens[id];
    if (!screen) return [];
    const { layout } = screen;
    return [{ screenId: id, name: screen.name, kind: screen.kind, route: screen.route, shell: screen.shell, layout, structure: getStructure(layout), responsive: getResponsive(layout) }];
  });
  if (inputs.length === 0) return doc;
  const result = withGeneratedScreens(doc, inputs);
  return result.ok ? result.doc : doc;
}
