import { t } from "../t";
import type { ContentProfile } from "../types";

export const devtools: ContentProfile = {
  id: "devtools",
  b2b: true,
  hero: {
    eyebrows: [t("Hecho por devs, para devs", "Built by developers, for developers"), t("Open source y autoalojable", "Open source and self-hostable")],
    titles: [
      t("Despliega en segundos, no en sprints", "Ship in seconds, not sprints"),
      t("La herramienta que tu flujo de trabajo pedía", "The tool your workflow was missing"),
      t("Menos configuración, más código", "Less config, more code"),
    ],
    subtitles: [
      t(
        "{name} se integra con tu repositorio y tu CI: cada push llega a producción con previews, logs y rollback en un clic.",
        "{name} plugs into your repo and CI: every push reaches production with previews, logs and one-click rollback.",
      ),
      t(
        "Una CLI, una API y un panel claro. Empieza en local y escala sin reescribir nada.",
        "One CLI, one API and a clear dashboard. Start locally and scale without rewriting anything.",
      ),
    ],
    primaryCta: t("Empieza gratis", "Start building"),
    secondaryCta: t("Leer la documentación", "Read the docs"),
  },
  landingNav: [t("Producto", "Product"), t("Documentación", "Docs"), t("Precios", "Pricing"), t("Changelog", "Changelog")],
  proofTitle: t("Equipos de ingeniería que despliegan con {name}", "Engineering teams that ship with {name}"),
  features: [
    {
      icon: "copy",
      title: t("Previews por cada rama", "A preview for every branch"),
      description: t(
        "Cada pull request tiene su URL para revisar los cambios antes de fusionar.",
        "Every pull request gets its own URL to review changes before merging.",
      ),
    },
    {
      icon: "search",
      title: t("Logs que se leen", "Logs you can actually read"),
      description: t(
        "Busca, filtra y sigue cada petición de punta a punta en tiempo real.",
        "Search, filter and trace every request end to end in real time.",
      ),
    },
    {
      icon: "loader",
      title: t("Rollback instantáneo", "Instant rollback"),
      description: t(
        "¿Algo salió mal? Vuelve a la versión anterior sin volver a desplegar.",
        "Something broke? Go back to the previous version without a redeploy.",
      ),
    },
    {
      icon: "sliders",
      title: t("Variables por entorno", "Per-environment variables"),
      description: t(
        "Secretos cifrados y separados para desarrollo, preview y producción.",
        "Encrypted secrets, separated for development, preview and production.",
      ),
    },
    {
      icon: "bar-chart",
      title: t("Métricas sin instrumentar", "Metrics without instrumentation"),
      description: t(
        "Latencia, errores y uso de recursos desde el primer deploy.",
        "Latency, errors and resource usage from the very first deploy.",
      ),
    },
    {
      icon: "users",
      title: t("Hecho para equipos", "Made for teams"),
      description: t(
        "Permisos por proyecto, auditoría y revisiones obligatorias antes de producción.",
        "Per-project permissions, audit logs and required reviews before production.",
      ),
    },
  ],
  stats: [
    { value: 40000, suffix: "+", label: t("desarrolladores", "developers") },
    { value: 1_200_000, format: "compact", label: t("deploys al mes", "deploys per month") },
    { value: 99.99, format: "percent", label: t("de disponibilidad", "uptime") },
  ],
  quotes: [
    t(
      "Pasamos de desplegar una vez por semana a hacerlo veinte veces al día sin miedo.",
      "We went from deploying once a week to twenty times a day, without fear.",
    ),
    t(
      "Las previews por rama cambiaron cómo revisamos código. Diseño y producto opinan antes de fusionar.",
      "Branch previews changed how we review code. Design and product weigh in before we merge.",
    ),
    t(
      "La CLI hace exactamente lo que esperas. Nada de magia que luego tengas que depurar.",
      "The CLI does exactly what you expect. No magic you have to debug later.",
    ),
  ],
  roles: [t("Ingeniera de plataforma", "Platform Engineer"), t("CTO", "CTO"), t("Desarrollador full-stack", "Full-Stack Developer"), t("Tech lead", "Tech Lead")],
  pricing: {
    period: "month",
    plans: [
      {
        name: t("Hobby", "Hobby"),
        price: 0,
        description: t("Para proyectos personales y pruebas.", "For side projects and experiments."),
        features: [
          t("Proyectos personales ilimitados", "Unlimited personal projects"),
          t("Previews por rama", "Branch previews"),
          t("Soporte de la comunidad", "Community support"),
        ],
      },
      {
        name: t("Pro", "Pro"),
        price: 20,
        description: t("Para devs que despliegan a diario.", "For developers who ship every day."),
        features: [
          t("Todo lo del plan Hobby", "Everything in Hobby"),
          t("Dominios personalizados", "Custom domains"),
          t("Logs de 30 días", "30-day log retention"),
          t("Colaboradores ilimitados", "Unlimited collaborators"),
        ],
      },
      {
        name: t("Equipo", "Team"),
        price: 99,
        description: t("Para equipos con procesos de revisión.", "For teams with review processes."),
        features: [
          t("Todo lo del plan Pro", "Everything in Pro"),
          t("SSO y auditoría", "SSO and audit logs"),
          t("Revisiones obligatorias", "Required reviews"),
          t("Soporte con SLA", "SLA-backed support"),
        ],
      },
    ],
    note: t("Precios por persona y mes. El plan Hobby es gratis para siempre.", "Prices per seat per month. Hobby is free forever."),
  },
  cta: {
    titles: [t("Tu próximo deploy, en menos de un minuto", "Your next deploy, in under a minute"), t("Instala la CLI y empieza", "Install the CLI and get going")],
    subtitle: t("Conecta tu repositorio y {name} se encarga del resto.", "Connect your repo and {name} takes care of the rest."),
    button: t("Crear proyecto", "Create a project"),
  },
  kpis: [
    { id: "deploys", label: t("Deploys esta semana", "Deploys this week"), format: "number", min: 120, max: 640, deltaMax: 18, icon: "arrow-up-right" },
    { id: "latency", label: t("Latencia p95", "p95 latency"), format: "ms", min: 90, max: 320, deltaMax: 14, invert: true, icon: "loader" },
    { id: "error-rate", label: t("Tasa de errores", "Error rate"), format: "percent", min: 0.1, max: 1.8, deltaMax: 25, invert: true, icon: "alert-triangle" },
    { id: "build-time", label: t("Tiempo medio de build", "Avg. build time"), format: "duration", min: 38, max: 180, deltaMax: 14, invert: true, icon: "calendar" },
  ],
  chart: {
    title: t("Peticiones por día", "Requests per day"),
    period: "day",
    series: [t("Producción", "Production"), t("Preview", "Preview")],
    format: "compact",
    min: 20000,
    max: 160000,
  },
  table: {
    title: t("Deploys recientes", "Recent deployments"),
    columns: [
      {
        key: "service",
        label: t("Servicio", "Service"),
        kind: "choice",
        options: [t("api", "api"), t("web", "web"), t("worker", "worker"), t("auth", "auth"), t("billing", "billing"), t("docs", "docs")],
      },
      {
        key: "branch",
        label: t("Rama", "Branch"),
        kind: "choice",
        options: [
          t("main", "main"),
          t("feat/onboarding", "feat/onboarding"),
          t("fix/cache-headers", "fix/cache-headers"),
          t("chore/deps", "chore/deps"),
          t("feat/search", "feat/search"),
          t("fix/timeouts", "fix/timeouts"),
        ],
      },
      {
        key: "status",
        label: t("Estado", "Status"),
        kind: "status",
        options: [
          { label: t("Listo", "Ready"), tone: "success", weight: 6 },
          { label: t("Compilando", "Building"), tone: "info", weight: 2 },
          { label: t("En cola", "Queued"), tone: "neutral", weight: 1 },
          { label: t("Error", "Failed"), tone: "destructive", weight: 1 },
        ],
      },
      { key: "duration", label: t("Duración", "Duration"), kind: "duration", min: 24, max: 210 },
      { key: "author", label: t("Autor", "Author"), kind: "person" },
      { key: "when", label: t("Cuándo", "When"), kind: "relative" },
    ],
  },
  activity: [
    {
      text: t("desplegó {target} en producción", "deployed {target} to production"),
      targets: [t("api v2.14.0", "api v2.14.0"), t("web v5.3.1", "web v5.3.1")],
      tone: "success",
      icon: "arrow-up-right",
    },
    {
      text: t("abrió la pull request {target}", "opened pull request {target}"),
      targets: [t("#482 Caché de sesiones", "#482 Session cache"), t("#479 Nuevo onboarding", "#479 New onboarding")],
      tone: "info",
      icon: "link",
    },
    {
      text: t("revirtió {target}", "rolled back {target}"),
      targets: [t("worker a la v1.8.2", "worker to v1.8.2")],
      tone: "warning",
      icon: "loader",
    },
    {
      text: t("rotó {target}", "rotated {target}"),
      targets: [t("las claves de producción", "the production keys")],
      tone: "neutral",
      icon: "sliders",
    },
    {
      text: t("resolvió la incidencia {target}", "resolved incident {target}"),
      targets: [t("Latencia alta en EU", "High latency in EU")],
      tone: "success",
      icon: "check-circle",
    },
  ],
  appNav: [
    { icon: "home", label: t("Proyectos", "Projects") },
    { icon: "arrow-up-right", label: t("Deploys", "Deployments") },
    { icon: "file", label: t("Logs", "Logs") },
    { icon: "bar-chart", label: t("Métricas", "Observability") },
    { icon: "link", label: t("Dominios", "Domains") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
