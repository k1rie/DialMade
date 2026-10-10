import { orderedScreens, type DesignDoc } from "@dialmade/doc";

/** Does any screen have an active AI block with HTML (something to copy)? Light: no @dialmade/ai-render. */
export const hasAiBlocks = (doc: DesignDoc): boolean =>
  orderedScreens(doc).some((screen) => Object.values(screen.aiRender?.blocks ?? {}).some((block) => block.active && block.html !== ""));
