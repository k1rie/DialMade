import { Badge } from "@dialmade/ui";
import type { ColorMode, SectionComponentProps } from "../../types";
import { BoardSection } from "../BoardSection";
import { textOr } from "../lib/board";
import { contrastRows, contrastSummary } from "../lib/contrast";
import { brandSystem } from "../lib/system";
import { ContrastTable } from "./ContrastTable";
import { PALETTE_COPY } from "./copy";
import type { PaletteProps } from "./definition";
import { PaletteChips } from "./PaletteChips";
import { PaletteScales } from "./PaletteScales";
import { RolesTable } from "./RolesTable";
import "./Palette.css";

const MODES: readonly ColorMode[] = ["light", "dark"];

/** 02 · Palette: core colors, 50–950 scales, roles in both modes and the AA contrast table. */
export function Palette({ title, intro, showScales, showContrast, variant, ctx, elementId }: SectionComponentProps<PaletteProps>) {
  const copy = PALETTE_COPY[ctx.locale];
  const system = brandSystem(ctx);
  const swatches = variant === "swatches";
  const summary = system && showContrast ? MODES.map((mode) => ({ mode, ...contrastSummary(contrastRows(system, mode)) })) : [];

  return (
    <BoardSection
      elementId={elementId}
      ctx={ctx}
      type="brand.palette"
      title={textOr(title, copy.title)}
      intro={textOr(intro, copy.intro)}
      variant={swatches ? "swatches" : "system"}
      className="dl-brand-palette"
      aside={
        summary.length > 0 ? (
          <ul className="dl-brand-palette__summary" aria-label={copy.summaryLabel}>
            {summary.map(({ mode, passed, total }) => (
              <li key={mode}>
                <Badge variant={passed === total ? "success" : "warning"} icon={passed === total ? "check" : "alert-triangle"}>
                  {copy.summary(copy[mode], passed, total)}
                </Badge>
              </li>
            ))}
          </ul>
        ) : undefined
      }
    >
      <PaletteChips ctx={ctx} system={system} tall={swatches} />
      {showScales && <PaletteScales ctx={ctx} system={system} />}
      {!swatches && system && (
        <div className="dl-brand-palette__tables" data-single={showContrast ? undefined : ""}>
          <RolesTable ctx={ctx} system={system} />
          {showContrast && <ContrastTable ctx={ctx} system={system} />}
        </div>
      )}
    </BoardSection>
  );
}
