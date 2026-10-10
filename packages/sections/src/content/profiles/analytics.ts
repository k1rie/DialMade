import { t } from "../t";
import type { ContentProfile } from "../types";

export const analytics: ContentProfile = {
  id: "analytics",
  b2b: true,
  hero: {
    eyebrows: [t("Datos en tiempo real", "Real-time data"), t("Analítica sin hojas de cálculo", "Analytics without spreadsheets")],
    titles: [
      t("Tus datos, claros a la primera", "Your data, clear at first glance"),
      t("Decide con datos, no con intuiciones", "Decide with data, not hunches"),
      t("Del dato a la decisión en segundos", "From data to decision in seconds"),
    ],
    subtitles: [
      t(
        "{name} conecta tus fuentes, limpia los datos y los convierte en paneles que todo el equipo entiende.",
        "{name} connects your sources, cleans the data and turns it into dashboards the whole team understands.",
      ),
      t(
        "Monitoriza en tiempo real, detecta anomalías antes que nadie y comparte informes con un enlace.",
        "Monitor in real time, catch anomalies first and share reports with a link.",
      ),
    ],
    primaryCta: t("Pruébalo gratis", "Try it free"),
    secondaryCta: t("Ver un panel de ejemplo", "See a sample dashboard"),
  },
  landingNav: [t("Producto", "Product"), t("Integraciones", "Integrations"), t("Precios", "Pricing"), t("Documentación", "Docs")],
  proofTitle: t("Equipos de datos que ya confían en {name}", "Data teams that already rely on {name}"),
  features: [
    {
      icon: "link",
      title: t("Conecta cualquier fuente", "Connect any source"),
      description: t(
        "Bases de datos, hojas de cálculo y APIs sincronizadas cada pocos minutos.",
        "Databases, spreadsheets and APIs synced every few minutes.",
      ),
    },
    {
      icon: "bar-chart",
      title: t("Paneles en minutos", "Dashboards in minutes"),
      description: t(
        "Arrastra métricas, elige el gráfico y publica. Sin SQL si no quieres.",
        "Drag in metrics, pick a chart and publish. No SQL unless you want it.",
      ),
    },
    {
      icon: "bell",
      title: t("Alertas de anomalías", "Anomaly alerts"),
      description: t(
        "Te avisamos cuando una métrica se sale de lo normal, con el contexto para entender por qué.",
        "Get notified when a metric breaks its pattern, with the context to see why.",
      ),
    },
    {
      icon: "filter",
      title: t("Segmentos al vuelo", "Segments on the fly"),
      description: t(
        "Filtra por región, canal o cohorte y compara periodos con un clic.",
        "Filter by region, channel or cohort and compare periods in one click.",
      ),
    },
    {
      icon: "download",
      title: t("Informes programados", "Scheduled reports"),
      description: t(
        "Envía un PDF o un CSV a quien lo necesite cada lunes a las nueve.",
        "Send a PDF or CSV to whoever needs it every Monday at nine.",
      ),
    },
    {
      icon: "check-circle",
      title: t("Una sola fuente de verdad", "One source of truth"),
      description: t(
        "Métricas definidas una vez y reutilizadas en todos los paneles.",
        "Metrics defined once and reused across every dashboard.",
      ),
    },
  ],
  stats: [
    { value: 3_200_000_000, format: "compact", label: t("eventos procesados al día", "events processed daily") },
    { value: 150, suffix: "+", label: t("conectores", "connectors") },
    { value: 60, suffix: " s", label: t("de latencia máxima", "maximum latency") },
  ],
  quotes: [
    t(
      "Ahora dirección mira el mismo panel que el equipo. Se acabaron las discusiones sobre qué cifra es la buena.",
      "Leadership now looks at the same dashboard as the team. No more arguing about which number is right.",
    ),
    t("Detectamos una caída de conversión en una hora en lugar de en una semana.", "We caught a conversion drop in an hour instead of a week."),
    t(
      "Montamos nuestro primer panel en una tarde y sin pedir ayuda a ingeniería.",
      "We built our first dashboard in an afternoon without asking engineering for help.",
    ),
  ],
  roles: [t("Analista de datos", "Data Analyst"), t("Directora financiera", "CFO"), t("Responsable de crecimiento", "Head of Growth"), t("Jefe de operaciones", "Operations Manager")],
  pricing: {
    period: "month",
    plans: [
      {
        name: t("Básico", "Starter"),
        price: 0,
        description: t("Para explorar tus primeros datos.", "For exploring your first data."),
        features: [t("3 paneles", "3 dashboards"), t("2 fuentes de datos", "2 data sources"), t("Actualización cada hora", "Hourly refresh")],
      },
      {
        name: t("Pro", "Pro"),
        price: 49,
        description: t("Para equipos que deciden con datos cada día.", "For teams that make data-driven calls every day."),
        features: [
          t("Paneles ilimitados", "Unlimited dashboards"),
          t("Fuentes ilimitadas", "Unlimited sources"),
          t("Alertas de anomalías", "Anomaly alerts"),
          t("Actualización cada 5 minutos", "5-minute refresh"),
        ],
      },
      {
        name: t("Empresa", "Enterprise"),
        price: 199,
        description: t("Para datos sensibles y equipos grandes.", "For sensitive data and large teams."),
        features: [
          t("Todo lo del plan Pro", "Everything in Pro"),
          t("SSO y permisos por fila", "SSO and row-level permissions"),
          t("Entorno dedicado", "Dedicated environment"),
          t("SLA del 99,9 %", "99.9% SLA"),
        ],
      },
    ],
    note: t("Precios por espacio de trabajo y mes.", "Prices per workspace per month."),
  },
  cta: {
    titles: [t("Convierte tus datos en decisiones", "Turn your data into decisions"), t("Tu primer panel, hoy", "Your first dashboard, today")],
    subtitle: t("Conecta una fuente y ten {name} funcionando en menos de diez minutos.", "Connect a source and have {name} running in under ten minutes."),
    button: t("Conectar mis datos", "Connect my data"),
  },
  kpis: [
    { id: "revenue", label: t("Ingresos", "Revenue"), format: "currency", min: 120000, max: 480000, deltaMax: 16, icon: "bar-chart" },
    { id: "sessions", label: t("Sesiones", "Sessions"), format: "compact", min: 80000, max: 420000, deltaMax: 22, icon: "users" },
    { id: "conversion", label: t("Tasa de conversión", "Conversion rate"), format: "percent", min: 1.8, max: 5.6, deltaMax: 12, icon: "arrow-up-right" },
    { id: "session-time", label: t("Duración media de sesión", "Avg. session duration"), format: "duration", min: 95, max: 310, deltaMax: 10, icon: "calendar" },
  ],
  chart: {
    title: t("Sesiones por canal", "Sessions by channel"),
    period: "month",
    series: [t("Orgánico", "Organic"), t("De pago", "Paid")],
    format: "compact",
    min: 12000,
    max: 68000,
  },
  table: {
    title: t("Rendimiento por canal", "Performance by channel"),
    columns: [
      {
        key: "channel",
        label: t("Canal", "Channel"),
        kind: "choice",
        unique: true,
        options: [
          t("Búsqueda orgánica", "Organic search"),
          t("Email", "Email"),
          t("Redes sociales", "Social"),
          t("Referidos", "Referral"),
          t("Búsqueda de pago", "Paid search"),
          t("Directo", "Direct"),
          t("Afiliados", "Affiliates"),
          t("Display", "Display"),
        ],
      },
      { key: "sessions", label: t("Sesiones", "Sessions"), kind: "number", min: 1200, max: 48000 },
      { key: "conversion", label: t("Conversión", "Conversion"), kind: "percent", min: 0.8, max: 6.5 },
      { key: "revenue", label: t("Ingresos", "Revenue"), kind: "money", min: 900, max: 38000 },
      {
        key: "trend",
        label: t("Tendencia", "Trend"),
        kind: "status",
        options: [
          { label: t("Al alza", "Rising"), tone: "success", weight: 3 },
          { label: t("Estable", "Stable"), tone: "neutral", weight: 3 },
          { label: t("A la baja", "Falling"), tone: "warning", weight: 2 },
        ],
      },
    ],
  },
  activity: [
    {
      text: t("publicó el panel {target}", "published the dashboard {target}"),
      targets: [t("Ventas semanales", "Weekly sales"), t("Embudo de registro", "Signup funnel")],
      tone: "info",
      icon: "bar-chart",
    },
    {
      text: t("activó una alerta en {target}", "set an alert on {target}"),
      targets: [t("Tasa de conversión", "Conversion rate"), t("Ingresos diarios", "Daily revenue")],
      tone: "neutral",
      icon: "bell",
    },
    {
      text: t("detectó una anomalía en {target}", "spotted an anomaly in {target}"),
      targets: [t("el tráfico de pago", "paid traffic"), t("las devoluciones", "refunds")],
      tone: "warning",
      icon: "alert-triangle",
    },
    {
      text: t("conectó {target}", "connected {target}"),
      targets: [t("la base de datos de pedidos", "the orders database"), t("el CRM", "the CRM")],
      tone: "success",
      icon: "link",
    },
    {
      text: t("exportó {target}", "exported {target}"),
      targets: [t("el informe trimestral", "the quarterly report"), t("las cohortes de marzo", "the March cohorts")],
      tone: "neutral",
      icon: "download",
    },
  ],
  appNav: [
    { icon: "home", label: t("Resumen", "Overview") },
    { icon: "bar-chart", label: t("Paneles", "Dashboards") },
    { icon: "filter", label: t("Segmentos", "Segments") },
    { icon: "bell", label: t("Alertas", "Alerts") },
    { icon: "link", label: t("Fuentes", "Sources") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
