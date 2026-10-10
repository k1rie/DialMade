import type { Locale } from "@dialmade/catalog";

export interface UiStrings {
  loading: string;
  close: string;
  dismiss: string;
  breadcrumb: string;
  pagination: string;
  previous: string;
  next: string;
  previousPage: string;
  nextPage: string;
  rowsRange: (from: number, to: number, total: number) => string;
  pageOf: (page: number, total: number) => string;
  noResults: string;
  moreAvatars: (count: number) => string;
  avatarStatus: Record<"online" | "away" | "busy" | "offline", string>;
  trendUp: string;
  trendDown: string;
  trendFlat: string;
  chartData: string;
  optional: string;
}

export const UI_STRINGS: Record<Locale, UiStrings> = {
  es: {
    loading: "Cargando…",
    close: "Cerrar",
    dismiss: "Descartar",
    breadcrumb: "Ruta de navegación",
    pagination: "Paginación",
    previous: "Anterior",
    next: "Siguiente",
    previousPage: "Página anterior",
    nextPage: "Página siguiente",
    rowsRange: (from, to, total) => `${from}–${to} de ${total}`,
    pageOf: (page, total) => `Página ${page} de ${total}`,
    noResults: "Sin resultados",
    moreAvatars: (count) => `${count} más`,
    avatarStatus: { online: "En línea", away: "Ausente", busy: "Ocupado", offline: "Desconectado" },
    trendUp: "Sube",
    trendDown: "Baja",
    trendFlat: "Sin cambios",
    chartData: "Datos de la gráfica",
    optional: "Opcional",
  },
  en: {
    loading: "Loading…",
    close: "Close",
    dismiss: "Dismiss",
    breadcrumb: "Breadcrumb",
    pagination: "Pagination",
    previous: "Previous",
    next: "Next",
    previousPage: "Previous page",
    nextPage: "Next page",
    rowsRange: (from, to, total) => `${from}–${to} of ${total}`,
    pageOf: (page, total) => `Page ${page} of ${total}`,
    noResults: "No results",
    moreAvatars: (count) => `${count} more`,
    avatarStatus: { online: "Online", away: "Away", busy: "Busy", offline: "Offline" },
    trendUp: "Up",
    trendDown: "Down",
    trendFlat: "No change",
    chartData: "Chart data",
    optional: "Optional",
  },
};
