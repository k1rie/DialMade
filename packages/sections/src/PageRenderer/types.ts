import type { Page } from "@dialmade/doc";
import type { SectionRegistry } from "../registry";
import type { ContentContext, RenderContext } from "../types";

/** What every element of one render shares. */
export interface RenderScope {
  page: Page;
  ctx: RenderContext;
  /** Stable across selection changes, so section props are not recomputed on every click. */
  content: ContentContext;
  registry: SectionRegistry;
  hidden: ReadonlySet<string>;
  exclude?: ReadonlySet<string>;
  onSectionError?: (id: string, error: unknown) => void;
}
