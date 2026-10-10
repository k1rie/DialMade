import { appNav } from "../../content/generators";
import { personName } from "../../content/people";
import { rngFor } from "../../content/rng";
import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import { APP_SHELL_TYPE, APP_SHELL_WIDGETS } from "../../constants";
import { appCopyOf, appStrings, shellStyleFor, text } from "../content";
import { shellSchema, type ShellProps } from "./schema";
import { Shell } from "./Shell";

export const shellSection = defineSection<ShellProps>({
  type: APP_SHELL_TYPE,
  kind: "app",
  label: t("Marco del dashboard", "Dashboard shell"),
  description: t(
    "Navegación, barra superior y cabecera de página alrededor de los widgets.",
    "Navigation, top bar and page header around the widgets.",
  ),
  variants: [
    { id: "sidebar", label: t("Barra lateral", "Sidebar") },
    { id: "inset", label: t("Panel flotante", "Inset panel") },
    { id: "rail", label: t("Barra compacta", "Icon rail") },
    { id: "topnav", label: t("Navegación superior", "Top navigation") },
  ],
  schema: shellSchema,
  knobs: [
    { key: "variant", label: t("Navegación", "Navigation"), control: "select", scope: "section" },
    {
      key: "tone",
      label: t("Color de la navegación", "Navigation color"),
      control: "select",
      options: [
        { value: "default", label: t("Claro", "Neutral") },
        { value: "inverted", label: t("Oscuro", "Dark") },
        { value: "brand", label: t("De marca", "Brand") },
      ],
      scope: "section",
    },
    {
      key: "density",
      label: t("Densidad", "Density"),
      control: "select",
      options: [
        { value: "compact", label: t("Compacta", "Compact") },
        { value: "comfortable", label: t("Cómoda", "Comfortable") },
        { value: "spacious", label: t("Aireada", "Spacious") },
      ],
      scope: "section",
    },
    { key: "showSearch", label: t("Búsqueda", "Search"), control: "toggle", scope: "section" },
    { key: "title", label: t("Título de la página", "Page title"), control: "text", scope: "section" },
    { key: "primaryAction", label: t("Acción principal", "Primary action"), control: "text", scope: "section" },
  ],
  bindings: { brandName: "brand.name" },
  container: true,
  defaultChildren: APP_SHELL_WIDGETS,
  defaultProps: (ctx) => {
    const strings = appStrings(ctx.locale);
    const copy = appCopyOf(ctx);
    const nav = appNav(ctx).map(({ id, label, icon, count }) => ({ id, label, icon, ...(count !== undefined && { count }) }));
    return {
      brandName: ctx.brand.name,
      workspace: strings.workspacePlan,
      title: strings.pageTitle,
      subtitle: text(copy.subtitle, ctx),
      primaryAction: text(copy.primaryAction, ctx),
      searchPlaceholder: text(copy.search, ctx),
      nav,
      activeId: nav[0]?.id ?? "",
      user: { name: personName(rngFor(ctx.seed, "app-shell-user"), ctx.locale), role: strings.userRole },
      ...shellStyleFor(ctx.productType),
      showSearch: true,
    };
  },
  Component: Shell,
});
