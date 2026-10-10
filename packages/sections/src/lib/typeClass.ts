/** `"app.kpiRow"` → `"app-kpi-row"`, for `dl-el--app-kpi-row`. */
export const typeClass = (type: string): string =>
  type
    .replace(/\./g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
