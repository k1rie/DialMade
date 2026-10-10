// Lazy boundary of everything after «Marca»: the doc engine (@dialmade/doc + @dialmade/sections, whose
// components import their own CSS, @dialmade/ui's first) and, as children of this chunk group, the views
// (the Layout step brings @dialmade/layout with it).
// Loading them all through here ships that CSS once and in order, whatever loads first.
export { designEngine } from "@/lib/design-engine";
export { pinnedFor } from "@dialmade/doc";

export const loadLayoutStep = () => import("@/components/LayoutStep").then((m) => m.LayoutStep);
export const loadComposer = () => import("@/components/Composer").then((m) => m.Composer);
export const loadExportDialog = () => import("@/components/ExportDialog").then((m) => m.ExportDialog);
export const loadDetectedReview = () => import("@/components/DetectedReview").then((m) => m.DetectedReview);
