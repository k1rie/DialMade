import type { AnySectionDefinition } from "../types";
import { activitySection } from "./Activity";
import { chartCardSection } from "./ChartCard";
import { componentGallerySection } from "./ComponentGallery";
import { confirmDialogSection } from "./ConfirmDialog";
import { dataTableSection } from "./DataTable";
import { emptyStateSection } from "./EmptyState";
import { kpiRowSection } from "./KpiRow";
import { settingsFormSection } from "./SettingsForm";
import { shellSection } from "./Shell";

// Dashboard y componentes: app.shell (container: navigation + top bar + page header) and its widgets.
export const appSections: readonly AnySectionDefinition[] = [
  shellSection,
  kpiRowSection,
  chartCardSection,
  activitySection,
  dataTableSection,
  settingsFormSection,
  emptyStateSection,
  confirmDialogSection,
  componentGallerySection,
];

export {
  activitySection,
  chartCardSection,
  componentGallerySection,
  confirmDialogSection,
  dataTableSection,
  emptyStateSection,
  kpiRowSection,
  settingsFormSection,
  shellSection,
};
export { shellStyleFor, type ShellDensity, type ShellTone } from "./content";
