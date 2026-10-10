import { t } from "../t";
import type { ContentProfile } from "../types";

export const consumer: ContentProfile = {
  id: "consumer",
  b2b: false,
  hero: {
    eyebrows: [t("Gratis para móvil y web", "Free on mobile and web"), t("App del día", "App of the day")],
    titles: [
      t("Pequeños hábitos, grandes cambios", "Small habits, big changes"),
      t("Tu día, un poco más fácil", "Your day, a little easier"),
      t("La app que de verdad vas a usar", "The app you'll actually use"),
    ],
    subtitles: [
      t(
        "{name} te ayuda a organizar tu día con recordatorios amables, rachas que motivan y un diseño que da gusto abrir.",
        "{name} helps you organize your day with gentle reminders, motivating streaks and a design you'll enjoy opening.",
      ),
      t(
        "Sencilla, rápida y privada. Empieza en segundos, sin crear cuenta.",
        "Simple, fast and private. Start in seconds, no account needed.",
      ),
    ],
    primaryCta: t("Descargar gratis", "Download free"),
    secondaryCta: t("Ver cómo funciona", "See how it works"),
  },
  landingNav: [t("Funciones", "Features"), t("Precios", "Pricing"), t("Opiniones", "Reviews"), t("Ayuda", "Help")],
  proofTitle: t("Han hablado de {name}", "{name} in the news"),
  features: [
    {
      icon: "bell",
      title: t("Recordatorios amables", "Gentle reminders"),
      description: t("Te avisa en el momento justo, sin agobiarte.", "Nudges you at the right moment, never nagging."),
    },
    {
      icon: "bar-chart",
      title: t("Rachas y estadísticas", "Streaks and stats"),
      description: t("Mira tu progreso y celebra cada semana completada.", "See your progress and celebrate every completed week."),
    },
    {
      icon: "sparkle",
      title: t("Un diseño que apetece", "A joy to use"),
      description: t(
        "Temas, widgets y animaciones pensados para abrirla cada día.",
        "Themes, widgets and animations made for everyday use.",
      ),
    },
    {
      icon: "check-circle",
      title: t("Privada por diseño", "Private by design"),
      description: t("Tus datos se quedan en tu móvil. Sin anuncios ni rastreo.", "Your data stays on your phone. No ads, no tracking."),
    },
    {
      icon: "users",
      title: t("Retos con amigos", "Challenges with friends"),
      description: t("Comparte objetivos y anímate con tu gente.", "Share goals and cheer each other on."),
    },
    {
      icon: "download",
      title: t("Funciona sin conexión", "Works offline"),
      description: t(
        "Todo disponible aunque no tengas cobertura, y se sincroniza al volver.",
        "Everything works without signal and syncs when you're back.",
      ),
    },
  ],
  stats: [
    { value: 2_000_000, format: "compact", label: t("descargas", "downloads") },
    { value: 4.8, format: "decimal", suffix: "/5", label: t("valoración media", "average rating") },
    { value: 30, suffix: " s", label: t("para empezar", "to get started") },
  ],
  quotes: [
    t("Llevo 90 días de racha. Nunca había mantenido un hábito tanto tiempo.", "I'm on a 90-day streak. I've never kept a habit this long."),
    t(
      "Es bonita, rápida y no me pide mil permisos. Justo lo que buscaba.",
      "It's beautiful, fast and doesn't ask for a thousand permissions. Exactly what I wanted.",
    ),
    t("Los retos con mis amigos la hacen mucho más divertida.", "Challenges with friends make it way more fun."),
  ],
  roles: [t("Usuaria desde hace un año", "User for a year"), t("Estudiante", "Student"), t("Usuario Pro", "Pro user")],
  pricing: {
    period: "month",
    plans: [
      {
        name: t("Gratis", "Free"),
        price: 0,
        description: t("Lo esencial, para siempre.", "The essentials, forever."),
        features: [t("Funciones básicas", "Core features"), t("Hasta 5 hábitos", "Up to 5 habits"), t("Widgets", "Widgets")],
      },
      {
        name: t("Pro", "Pro"),
        price: 3,
        description: t("Sin límites.", "No limits."),
        features: [
          t("Hábitos ilimitados", "Unlimited habits"),
          t("Estadísticas avanzadas", "Advanced stats"),
          t("Temas exclusivos", "Exclusive themes"),
          t("Sincronización entre dispositivos", "Sync across devices"),
        ],
      },
      {
        name: t("Familia", "Family"),
        price: 6,
        description: t("Para compartir con los tuyos.", "To share with your people."),
        features: [t("Hasta 6 personas", "Up to 6 people"), t("Todo lo de Pro", "Everything in Pro"), t("Retos compartidos", "Shared challenges")],
      },
    ],
    note: t("Prueba Pro gratis durante 7 días.", "Try Pro free for 7 days."),
  },
  cta: {
    titles: [t("Empieza hoy y nota el cambio", "Start today and feel the difference"), t("Descárgala gratis", "Get it free")],
    subtitle: t(
      "Disponible en tu móvil y en la web. {name} se configura en menos de un minuto.",
      "Available on your phone and on the web. {name} takes less than a minute to set up.",
    ),
    button: t("Descargar la app", "Download the app"),
  },
  kpis: [
    { id: "dau", label: t("Usuarios activos diarios", "Daily active users"), format: "compact", min: 18000, max: 140000, deltaMax: 12, icon: "users" },
    { id: "retention", label: t("Retención a 30 días", "30-day retention"), format: "percent", min: 28, max: 56, deltaMax: 8, icon: "check-circle" },
    { id: "sessions", label: t("Sesiones por usuario", "Sessions per user"), format: "decimal", min: 3, max: 9, deltaMax: 10, icon: "bar-chart" },
    { id: "pro", label: t("Suscripciones Pro", "Pro subscriptions"), format: "number", min: 800, max: 6400, deltaMax: 18, icon: "sparkle" },
  ],
  chart: {
    title: t("Usuarios activos por semana", "Weekly active users"),
    period: "week",
    series: [t("Móvil", "Mobile"), t("Web", "Web")],
    format: "compact",
    min: 8000,
    max: 60000,
  },
  table: {
    title: t("Usuarios recientes", "Recent users"),
    columns: [
      { key: "user", label: t("Usuario", "User"), kind: "person" },
      { key: "plan", label: t("Plan", "Plan"), kind: "choice", options: [t("Gratis", "Free"), t("Pro", "Pro"), t("Familia", "Family")] },
      { key: "streak", label: t("Racha", "Streak"), kind: "number", min: 0, max: 180, unit: t(" días", " days") },
      { key: "platform", label: t("Plataforma", "Platform"), kind: "choice", options: [t("Móvil", "Mobile"), t("Web", "Web"), t("Tableta", "Tablet")] },
      {
        key: "status",
        label: t("Estado", "Status"),
        kind: "status",
        options: [
          { label: t("Activo", "Active"), tone: "success", weight: 5 },
          { label: t("En prueba", "Trial"), tone: "info", weight: 2 },
          { label: t("Inactivo", "Inactive"), tone: "neutral", weight: 2 },
          { label: t("Cancelado", "Canceled"), tone: "warning", weight: 1 },
        ],
      },
    ],
  },
  activity: [
    {
      text: t("consiguió {target}", "hit {target}"),
      targets: [t("una racha de 30 días", "a 30-day streak"), t("una racha de 100 días", "a 100-day streak")],
      tone: "success",
      icon: "sparkle",
    },
    {
      text: t("se pasó a {target}", "upgraded to {target}"),
      targets: [t("Pro", "Pro"), t("Familia", "Family")],
      tone: "info",
      icon: "arrow-up-right",
    },
    {
      text: t("invitó a {target}", "invited {target}"),
      targets: [t("2 amigos", "2 friends")],
      tone: "info",
      icon: "users",
    },
    {
      text: t("completó {target}", "completed {target}"),
      targets: [t("el reto semanal", "the weekly challenge")],
      tone: "success",
      icon: "check-circle",
    },
    {
      text: t("reportó {target}", "reported {target}"),
      targets: [t("un error en los widgets", "a widget bug")],
      tone: "warning",
      icon: "alert-triangle",
    },
  ],
  appNav: [
    { icon: "home", label: t("Inicio", "Home") },
    { icon: "users", label: t("Usuarios", "Users") },
    { icon: "bar-chart", label: t("Retención", "Retention") },
    { icon: "sparkle", label: t("Suscripciones", "Subscriptions") },
    { icon: "bell", label: t("Notificaciones", "Notifications") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
