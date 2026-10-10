import type { LibraryBlockType } from "@dialmade/layout";
import type { LayoutDictionary } from "@/i18n/layout";
import type { ProposalWarning } from "@/lib/ai/layout/normalize";

/** One line for what normalization changed in a variant («Agenda · Próximas citas: ajustado a la rejilla.»). */
export function warningText(
  warning: ProposalWarning,
  text: LayoutDictionary["describe"]["warning"],
  blockName: (type: LibraryBlockType) => string,
): string {
  switch (warning.code) {
    case "mapped-type":
      return text["mapped-type"](warning.screen, warning.label, warning.from, blockName(warning.to));
    case "nav-frame":
      return text["nav-frame"](warning.screen, warning.label);
    case "clamped":
      return text.clamped(warning.screen, warning.label);
    case "placed":
      return text.placed(warning.screen, warning.label);
    case "clipped":
      return text.clipped(warning.screen, warning.label);
    case "moved":
      return text.moved(warning.screen, warning.label, warning.below);
    case "overlap":
      return text.overlap(warning.screen, warning.labels[0], warning.labels[1]);
    case "link-dropped":
      return text["link-dropped"](warning.screen, warning.label);
    case "trimmed":
      return text.trimmed(warning.count);
    case "recipe-unknown":
      return text["recipe-unknown"];
  }
}
