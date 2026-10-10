import type { OutputKind } from "@dialmade/catalog";
import type { CSSProperties } from "react";

export type DestinationId = "code" | "figma" | "claudeDesign" | "framer" | "ai";

/** Best fit first, per page focus (output-type-step.md §4, «Handoff»). */
export const DESTINATION_ORDER: Readonly<Record<OutputKind, readonly DestinationId[]>> = {
  brand: ["claudeDesign", "figma", "code", "ai", "framer"],
  landing: ["framer", "code", "claudeDesign", "figma", "ai"],
  app: ["code", "claudeDesign", "figma", "ai", "framer"],
};

/** Prompt packs of the «Tu IA» card. */
export const AI_TARGETS = [
  { id: "claude", label: "Claude" },
  { id: "cursor", label: "Cursor" },
  { id: "v0", label: "v0" },
] as const;
export type AiTargetId = (typeof AI_TARGETS)[number]["id"];

export { EXPORT_TOASTER_ID } from "@/lib/toasters";

export const TOASTER_STYLE = {
  "--normal-bg": "var(--app-bg-elevated)",
  "--normal-border": "var(--app-border-strong)",
  "--normal-text": "var(--app-text)",
  "--border-radius": "14px",
  "--width": "360px",
  fontFamily: "var(--font-sans)",
} as CSSProperties;
