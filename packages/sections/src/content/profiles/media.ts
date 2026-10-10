import { t } from "../t";
import type { ContentProfile } from "../types";

export const media: ContentProfile = {
  id: "media",
  b2b: false,
  hero: {
    eyebrows: [t("Nuevos episodios cada semana", "New episodes every week"), t("Sin anuncios", "Ad-free")],
    titles: [
      t("Historias que merecen tu tiempo", "Stories worth your time"),
      t("Escucha, mira y lee sin ruido", "Listen, watch and read without the noise"),
      t("Lo mejor, elegido para ti", "The best, picked for you"),
    ],
    subtitles: [
      t(
        "{name} reúne contenidos seleccionados por personas, no por algoritmos, para que descubras algo bueno cada día.",
        "{name} brings together content curated by people, not algorithms, so you discover something good every day.",
      ),
      t(
        "Sin anuncios, en todos tus dispositivos y con descargas para cuando no tengas conexión.",
        "Ad-free, on all your devices, with downloads for when you're offline.",
      ),
    ],
    primaryCta: t("Empieza tu prueba", "Start your free trial"),
    secondaryCta: t("Explorar el catálogo", "Browse the catalog"),
  },
  landingNav: [t("Explorar", "Browse"), t("Novedades", "New"), t("Planes", "Plans"), t("Ayuda", "Help")],
  proofTitle: t("Recomendado por", "Recommended by"),
  features: [
    {
      icon: "sparkle",
      title: t("Selección editorial", "Editorial picks"),
      description: t("Cada semana, un equipo elige lo que no te puedes perder.", "Every week, our editors pick what you can't miss."),
    },
    {
      icon: "download",
      title: t("Descargas sin conexión", "Offline downloads"),
      description: t("Guarda episodios y artículos para el viaje.", "Save episodes and articles for the trip."),
    },
    {
      icon: "users",
      title: t("Perfiles para toda la casa", "Profiles for the whole household"),
      description: t("Recomendaciones separadas para cada persona.", "Separate recommendations for everyone."),
    },
    {
      icon: "bell",
      title: t("Avisos de estrenos", "Release alerts"),
      description: t(
        "Entérate el primer día cuando sale algo de lo que sigues.",
        "Know on day one when something you follow is out.",
      ),
    },
    {
      icon: "folder",
      title: t("Listas para después", "Save for later"),
      description: t(
        "Guarda lo que te interesa y retómalo justo donde lo dejaste.",
        "Save what catches your eye and pick up right where you left off.",
      ),
    },
    {
      icon: "check-circle",
      title: t("Sin anuncios", "No ads"),
      description: t("Una experiencia limpia, sin interrupciones ni rastreo.", "A clean experience, no interruptions, no tracking."),
    },
  ],
  stats: [
    { value: 1_200_000, format: "compact", label: t("oyentes al mes", "monthly listeners") },
    { value: 3500, suffix: "+", label: t("episodios y artículos", "episodes and articles") },
    { value: 4.8, format: "decimal", suffix: "/5", label: t("valoración media", "average rating") },
  ],
  quotes: [
    t(
      "Es lo primero que abro por la mañana. Siempre encuentro algo que me engancha.",
      "It's the first thing I open in the morning. I always find something that hooks me.",
    ),
    t("Las descargas sin conexión me salvan los viajes en tren.", "Offline downloads save my train rides."),
    t(
      "Se nota la mano editorial: menos cantidad, mucha más calidad.",
      "You can feel the editorial touch: less quantity, much more quality.",
    ),
  ],
  roles: [t("Suscriptora", "Subscriber"), t("Oyente desde 2022", "Listener since 2022"), t("Periodista", "Journalist")],
  pricing: {
    period: "month",
    plans: [
      {
        name: t("Gratis", "Free"),
        price: 0,
        description: t("Para conocernos.", "To get to know us."),
        features: [t("Selección semanal", "Weekly picks"), t("Con anuncios", "With ads"), t("1 dispositivo", "1 device")],
      },
      {
        name: t("Premium", "Premium"),
        price: 7,
        description: t("Todo el catálogo, sin interrupciones.", "The full catalog, uninterrupted."),
        features: [
          t("Catálogo completo", "Full catalog"),
          t("Sin anuncios", "No ads"),
          t("Descargas sin conexión", "Offline downloads"),
          t("Máxima calidad", "Highest quality"),
        ],
      },
      {
        name: t("Familia", "Family"),
        price: 12,
        description: t("Para compartir en casa.", "To share at home."),
        features: [t("Hasta 6 perfiles", "Up to 6 profiles"), t("Todo lo de Premium", "Everything in Premium"), t("Control parental", "Parental controls")],
      },
    ],
    note: t("Prueba gratis de 30 días. Cancela cuando quieras.", "30-day free trial. Cancel anytime."),
  },
  cta: {
    titles: [t("Tu próxima historia favorita te espera", "Your next favorite story is waiting"), t("Prueba un mes gratis", "Try a month free")],
    subtitle: t("Accede a todo el catálogo de {name} sin anuncios.", "Get {name}'s entire catalog, ad-free."),
    button: t("Empezar la prueba gratis", "Start free trial"),
  },
  kpis: [
    { id: "plays", label: t("Reproducciones", "Plays"), format: "compact", min: 180000, max: 920000, deltaMax: 16, icon: "bar-chart" },
    { id: "subscribers", label: t("Suscriptores", "Subscribers"), format: "number", min: 12000, max: 86000, deltaMax: 9, icon: "users" },
    { id: "listening", label: t("Escucha media", "Avg. listening time"), format: "duration", min: 900, max: 2700, deltaMax: 7, icon: "calendar" },
    { id: "churn", label: t("Bajas mensuales", "Monthly churn"), format: "percent", min: 1.5, max: 5, deltaMax: 12, invert: true, icon: "log-out" },
  ],
  chart: {
    title: t("Reproducciones por semana", "Plays per week"),
    period: "week",
    series: [t("Episodios", "Episodes"), t("Artículos", "Articles")],
    format: "compact",
    min: 12000,
    max: 90000,
  },
  table: {
    title: t("Contenido publicado", "Published content"),
    columns: [
      {
        key: "title",
        label: t("Título", "Title"),
        kind: "choice",
        unique: true,
        options: [
          t("La ciudad que no duerme", "The City That Never Sleeps"),
          t("Oficios que vuelven", "Crafts Making a Comeback"),
          t("Guía del café de especialidad", "A Guide to Specialty Coffee"),
          t("Diez libros para el otoño", "Ten Books for Fall"),
          t("El sonido del mar", "The Sound of the Sea"),
          t("Cocina de aprovechamiento", "Zero-Waste Cooking"),
          t("Crónica de una maratón", "Chronicle of a Marathon"),
          t("Arquitectura que respira", "Architecture That Breathes"),
        ],
      },
      {
        key: "format",
        label: t("Formato", "Format"),
        kind: "choice",
        options: [t("Pódcast", "Podcast"), t("Artículo", "Article"), t("Vídeo", "Video"), t("Newsletter", "Newsletter")],
      },
      { key: "plays", label: t("Reproducciones", "Plays"), kind: "number", min: 1200, max: 240000, compact: true },
      {
        key: "status",
        label: t("Estado", "Status"),
        kind: "status",
        options: [
          { label: t("Publicado", "Published"), tone: "success", weight: 5 },
          { label: t("Programado", "Scheduled"), tone: "info", weight: 2 },
          { label: t("Borrador", "Draft"), tone: "neutral", weight: 2 },
          { label: t("En revisión", "In review"), tone: "warning", weight: 1 },
        ],
      },
      { key: "date", label: t("Fecha", "Date"), kind: "date" },
    ],
  },
  activity: [
    {
      text: t("publicó {target}", "published {target}"),
      targets: [t("el episodio 48", "episode 48"), t("Diez libros para el otoño", "Ten Books for Fall")],
      tone: "success",
      icon: "sparkle",
    },
    {
      text: t("programó {target}", "scheduled {target}"),
      targets: [t("la newsletter del viernes", "Friday's newsletter")],
      tone: "info",
      icon: "calendar",
    },
    {
      text: t("editó {target}", "edited {target}"),
      targets: [t("Guía del café de especialidad", "A Guide to Specialty Coffee")],
      tone: "neutral",
      icon: "edit",
    },
    {
      text: t("respondió a {target}", "replied to {target}"),
      targets: [t("12 comentarios", "12 comments")],
      tone: "neutral",
      icon: "mail",
    },
    {
      text: t("envió a revisión {target}", "sent {target} to review"),
      targets: [t("Arquitectura que respira", "Architecture That Breathes")],
      tone: "warning",
      icon: "alert-triangle",
    },
  ],
  appNav: [
    { icon: "home", label: t("Inicio", "Home") },
    { icon: "folder", label: t("Contenido", "Content") },
    { icon: "calendar", label: t("Calendario", "Calendar") },
    { icon: "users", label: t("Audiencia", "Audience") },
    { icon: "bar-chart", label: t("Estadísticas", "Analytics") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
