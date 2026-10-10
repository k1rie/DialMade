import type { SectionComponentProps } from "../../types";
import { BoardSection } from "../BoardSection";
import { textOr } from "../lib/board";
import { ComponentsShowcase } from "./ComponentsShowcase";
import { ComponentsStates } from "./ComponentsStates";
import { COMPONENTS_COPY } from "./copy";
import type { ComponentsProps } from "./definition";

/** 05 · Components: @dialmade/ui wearing the brand, as a showcase or as a matrix of states. */
export function Components({ title, intro, showTable, variant, ctx, elementId }: SectionComponentProps<ComponentsProps>) {
  const copy = COMPONENTS_COPY[ctx.locale];
  const states = variant === "states";
  return (
    <BoardSection
      elementId={elementId}
      ctx={ctx}
      type="brand.components"
      title={textOr(title, copy.title)}
      intro={textOr(intro, copy.intro)}
      variant={states ? "states" : "showcase"}
      className="dl-brand-components"
    >
      {states ? <ComponentsStates ctx={ctx} elementId={elementId} /> : <ComponentsShowcase ctx={ctx} showTable={showTable} />}
    </BoardSection>
  );
}
