import { t } from "../t";
import type { ContentProfile } from "../types";

export const saas: ContentProfile = {
  id: "saas",
  b2b: true,
  hero: {
    eyebrows: [t("Nuevo: automatizaciones sin código", "New: no-code automations"), t("Para equipos que crecen", "Built for growing teams")],
    titles: [
      t("Todo tu trabajo, en un solo lugar", "All your work, in one place"),
      t("Menos herramientas. Más trabajo hecho.", "Fewer tools. More work done."),
      t("El sistema operativo de tu equipo", "The operating system for your team"),
    ],
    subtitles: [
      t(
        "{name} reúne proyectos, documentos y conversaciones para que tu equipo decida rápido y avance sin perseguir actualizaciones.",
        "{name} brings projects, docs and conversations together so your team decides faster and ships without chasing updates.",
      ),
      t(
        "Planifica, colabora y mide en una sola herramienta. Empieza en minutos, sin migraciones eternas.",
        "Plan, collaborate and measure in one tool. Get started in minutes, without endless migrations.",
      ),
    ],
    primaryCta: t("Empieza gratis", "Start for free"),
    secondaryCta: t("Ver demo", "Watch the demo"),
  },
  landingNav: [t("Producto", "Product"), t("Precios", "Pricing"), t("Clientes", "Customers"), t("Recursos", "Resources")],
  proofTitle: t("Equipos de todos los tamaños ya trabajan con {name}", "Teams of every size already work with {name}"),
  features: [
    {
      icon: "sliders",
      title: t("Flujos a tu medida", "Workflows that fit"),
      description: t(
        "Diseña estados, campos y vistas para cada equipo sin pedir ayuda a ingeniería.",
        "Shape statuses, fields and views for every team without filing a ticket with engineering.",
      ),
    },
    {
      icon: "users",
      title: t("Colaboración en tiempo real", "Real-time collaboration"),
      description: t(
        "Comenta, menciona y edita a la vez. Todos ven la misma versión, siempre.",
        "Comment, mention and edit together. Everyone sees the same version, always.",
      ),
    },
    {
      icon: "bar-chart",
      title: t("Informes que se explican solos", "Reports that explain themselves"),
      description: t(
        "Paneles con los números que importan, actualizados solos y listos para compartir.",
        "Dashboards with the numbers that matter, always up to date and ready to share.",
      ),
    },
    {
      icon: "link",
      title: t("Integraciones en un clic", "One-click integrations"),
      description: t(
        "Conecta tu correo, tu calendario y las herramientas que ya usas en segundos.",
        "Connect your email, calendar and the tools you already use in seconds.",
      ),
    },
    {
      icon: "bell",
      title: t("Avisos que no molestan", "Notifications that respect focus"),
      description: t(
        "Resúmenes diarios y alertas solo cuando algo necesita tu atención.",
        "Daily digests and alerts only when something actually needs you.",
      ),
    },
    {
      icon: "check-circle",
      title: t("Seguridad de serie", "Secure by default"),
      description: t(
        "Inicio de sesión único, permisos por rol y copias de seguridad automáticas.",
        "Single sign-on, role-based permissions and automatic backups.",
      ),
    },
  ],
  stats: [
    { value: 12000, suffix: "+", label: t("equipos activos", "active teams") },
    { value: 99.95, format: "percent", label: t("de disponibilidad", "uptime") },
    { value: 4.8, format: "decimal", suffix: "/5", label: t("valoración media", "average rating") },
  ],
  quotes: [
    t(
      "Pasamos de cinco herramientas a una. Las reuniones de seguimiento casi han desaparecido.",
      "We went from five tools to one. Status meetings have all but disappeared.",
    ),
    t(
      "La pusimos en marcha un lunes y el viernes todo el equipo la usaba sin formación.",
      "We rolled it out on a Monday and by Friday the whole team was using it, no training needed.",
    ),
    t("Por fin sé en qué está cada proyecto sin preguntar a nadie.", "I finally know where every project stands without asking anyone."),
    t(
      "Los informes semanales que me llevaban una tarde ahora se hacen solos.",
      "The weekly reports that took me an afternoon now build themselves.",
    ),
  ],
  roles: [
    t("Directora de operaciones", "Head of Operations"),
    t("Product manager", "Product Manager"),
    t("CEO", "CEO"),
    t("Responsable de proyectos", "Project Lead"),
  ],
  pricing: {
    period: "month",
    plans: [
      {
        name: t("Básico", "Starter"),
        price: 0,
        description: t("Para equipos pequeños que empiezan.", "For small teams getting started."),
        features: [t("Hasta 5 personas", "Up to 5 members"), t("Proyectos ilimitados", "Unlimited projects"), t("Integraciones básicas", "Core integrations")],
      },
      {
        name: t("Equipo", "Team"),
        price: 12,
        description: t("Para equipos que se coordinan a diario.", "For teams that coordinate every day."),
        features: [
          t("Todo lo del plan Básico", "Everything in Starter"),
          t("Automatizaciones", "Automations"),
          t("Informes avanzados", "Advanced reporting"),
          t("Soporte prioritario", "Priority support"),
        ],
      },
      {
        name: t("Empresa", "Business"),
        price: 29,
        description: t("Para organizaciones con requisitos de seguridad.", "For organizations with security requirements."),
        features: [
          t("Todo lo del plan Equipo", "Everything in Team"),
          t("SSO y SCIM", "SSO and SCIM"),
          t("Registro de auditoría", "Audit log"),
          t("Gestor de cuenta dedicado", "Dedicated account manager"),
        ],
      },
    ],
    note: t("Precios por persona y mes. Cancela cuando quieras.", "Prices per member per month. Cancel anytime."),
  },
  cta: {
    titles: [t("Tu equipo, por fin sincronizado", "Get your team in sync"), t("Empieza hoy, sin tarjeta", "Start today, no card required")],
    subtitle: t("Prueba {name} gratis durante 14 días. Importa tus datos en minutos.", "Try {name} free for 14 days. Import your data in minutes."),
    button: t("Crear cuenta gratis", "Create a free account"),
  },
  kpis: [
    { id: "mrr", label: t("Ingresos recurrentes (MRR)", "Monthly recurring revenue"), format: "currency", min: 38000, max: 92000, deltaMax: 14, icon: "bar-chart" },
    { id: "active-users", label: t("Usuarios activos", "Active users"), format: "number", min: 2400, max: 9800, deltaMax: 12, icon: "users" },
    { id: "churn", label: t("Tasa de bajas", "Churn rate"), format: "percent", min: 1.2, max: 4.5, deltaMax: 18, invert: true, icon: "log-out" },
    { id: "open-tickets", label: t("Tickets abiertos", "Open tickets"), format: "number", min: 12, max: 80, deltaMax: 20, invert: true, icon: "inbox" },
  ],
  chart: {
    title: t("Cuentas nuevas por mes", "New accounts per month"),
    period: "month",
    series: [t("Prueba gratuita", "Free trial"), t("De pago", "Paid")],
    format: "number",
    min: 80,
    max: 420,
  },
  table: {
    title: t("Cuentas recientes", "Recent accounts"),
    columns: [
      { key: "account", label: t("Cuenta", "Account"), kind: "company" },
      { key: "owner", label: t("Responsable", "Owner"), kind: "person" },
      { key: "plan", label: t("Plan", "Plan"), kind: "choice", options: [t("Básico", "Starter"), t("Equipo", "Team"), t("Empresa", "Business")] },
      {
        key: "status",
        label: t("Estado", "Status"),
        kind: "status",
        options: [
          { label: t("Activa", "Active"), tone: "success", weight: 5 },
          { label: t("En prueba", "Trial"), tone: "info", weight: 3 },
          { label: t("Pago pendiente", "Past due"), tone: "warning", weight: 2 },
          { label: t("Cancelada", "Canceled"), tone: "destructive", weight: 1 },
        ],
      },
      { key: "mrr", label: t("MRR", "MRR"), kind: "money", min: 49, max: 2400 },
      { key: "joined", label: t("Alta", "Joined"), kind: "date" },
    ],
  },
  activity: [
    {
      text: t("creó el proyecto {target}", "created the project {target}"),
      targets: [t("Rediseño web", "Website redesign"), t("Lanzamiento Q4", "Q4 launch"), t("Onboarding 2.0", "Onboarding 2.0")],
      tone: "info",
      icon: "folder",
    },
    {
      text: t("completó {target}", "completed {target}"),
      targets: [t("la revisión de contratos", "the contract review"), t("la migración de datos", "the data migration")],
      tone: "success",
      icon: "check-circle",
    },
    {
      text: t("comentó en {target}", "commented on {target}"),
      targets: [t("la hoja de ruta", "the roadmap"), t("el informe mensual", "the monthly report")],
      tone: "neutral",
      icon: "edit",
    },
    {
      text: t("invitó a {target}", "invited {target}"),
      targets: [t("3 personas al equipo", "3 people to the team"), t("todo el equipo de diseño", "the whole design team")],
      tone: "info",
      icon: "users",
    },
    {
      text: t("marcó como bloqueada {target}", "flagged {target} as blocked"),
      targets: [t("la integración de pagos", "the payments integration"), t("la exportación de datos", "the data export")],
      tone: "warning",
      icon: "alert-triangle",
    },
  ],
  appNav: [
    { icon: "home", label: t("Inicio", "Home") },
    { icon: "folder", label: t("Proyectos", "Projects") },
    { icon: "inbox", label: t("Bandeja", "Inbox") },
    { icon: "bar-chart", label: t("Informes", "Reports") },
    { icon: "users", label: t("Equipo", "Team") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
