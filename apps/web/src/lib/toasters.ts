/**
 * A modal <dialog> sits in the top layer, above the app's Toaster: the export dialog mounts its own one (same look
 * as Providers) and its toasts target it. Shared so the flow's toasts can target it too while it is open, without
 * loading the dialog (it loads in the design half).
 */
export const EXPORT_TOASTER_ID = "export-dialog";
