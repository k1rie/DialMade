import type { ContentContext } from "../types";

/** Props shared by the three minis: content only. The theme comes from an ancestor (`ThemeStyles`). */
export interface MiniProps {
  ctx: ContentContext;
  className?: string;
}
