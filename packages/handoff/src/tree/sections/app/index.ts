import type { SectionBuilder } from "../../context";
import { activityBuilder } from "./activity";
import { chartCardBuilder } from "./chartCard";
import { componentGalleryBuilder } from "./componentGallery";
import { confirmDialogBuilder } from "./confirmDialog";
import { dataTableBuilder } from "./dataTable";
import { emptyStateBuilder } from "./emptyState";
import { kpiRowBuilder } from "./kpiRow";
import { settingsFormBuilder } from "./settingsForm";
import { shellBuilder } from "./shell";

/** Builders of the `app.*` sections. */
export const APP_BUILDERS: Readonly<Record<string, SectionBuilder>> = {
  "app.shell": shellBuilder,
  "app.kpiRow": kpiRowBuilder,
  "app.chartCard": chartCardBuilder,
  "app.activity": activityBuilder,
  "app.dataTable": dataTableBuilder,
  "app.settingsForm": settingsFormBuilder,
  "app.emptyState": emptyStateBuilder,
  "app.confirmDialog": confirmDialogBuilder,
  "app.componentGallery": componentGalleryBuilder,
};
