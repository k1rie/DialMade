import { t } from "../t";
import type { ContentProfile } from "../types";

export const community: ContentProfile = {
  id: "community",
  b2b: false,
  hero: {
    eyebrows: [t("Únete a la conversación", "Join the conversation"), t("Más de 50.000 miembros", "50,000+ members")],
    titles: [
      t("Tu gente, en un mismo lugar", "Your people, in one place"),
      t("Conecta con quien comparte tus intereses", "Connect with people who share your interests"),
      t("Comunidades que se sienten como casa", "Communities that feel like home"),
    ],
    subtitles: [
      t(
        "{name} es el espacio para conversar, organizar encuentros y aprender con personas que van en tu misma dirección.",
        "{name} is the place to talk, organize meetups and learn with people headed the same way you are.",
      ),
      t(
        "Debates con calma, eventos en directo y una moderación que cuida el ambiente.",
        "Calm discussions, live events and moderation that protects the vibe.",
      ),
    ],
    primaryCta: t("Unirme gratis", "Join for free"),
    secondaryCta: t("Explorar comunidades", "Explore communities"),
  },
  landingNav: [t("Comunidades", "Communities"), t("Eventos", "Events"), t("Membresías", "Memberships"), t("Ayuda", "Help")],
  proofTitle: t("Comunidades que ya se organizan con {name}", "Communities already organizing on {name}"),
  features: [
    {
      icon: "mail",
      title: t("Conversaciones con hilo", "Threaded conversations"),
      description: t(
        "Debates ordenados por temas para que nada importante se pierda.",
        "Discussions organized by topic so nothing important gets lost.",
      ),
    },
    {
      icon: "calendar",
      title: t("Eventos y encuentros", "Events and meetups"),
      description: t(
        "Organiza quedadas y directos con inscripción y recordatorios.",
        "Host meetups and live sessions with RSVPs and reminders.",
      ),
    },
    {
      icon: "check-circle",
      title: t("Moderación sencilla", "Simple moderation"),
      description: t(
        "Reglas claras, reportes rápidos y herramientas para cuidar el ambiente.",
        "Clear rules, quick reports and tools to keep things healthy.",
      ),
    },
    {
      icon: "users",
      title: t("Perfiles y grupos", "Profiles and groups"),
      description: t(
        "Encuentra gente afín por intereses, ciudad o experiencia.",
        "Find like-minded people by interest, city or experience.",
      ),
    },
    {
      icon: "bell",
      title: t("Resúmenes semanales", "Weekly digests"),
      description: t("Lo más interesante de la semana en tu correo, sin ruido.", "The best of the week in your inbox, without the noise."),
    },
    {
      icon: "sparkle",
      title: t("Membresías", "Memberships"),
      description: t("Contenido exclusivo y ventajas para quien apoya la comunidad.", "Exclusive content and perks for supporters."),
    },
  ],
  stats: [
    { value: 50000, suffix: "+", label: t("miembros", "members") },
    { value: 1200, suffix: "+", label: t("eventos al año", "events a year") },
    { value: 87, format: "percent", label: t("vuelven cada semana", "come back every week") },
  ],
  quotes: [
    t(
      "Aquí conocí a las personas con las que hoy organizo un club de lectura cada mes.",
      "I met the people I now run a monthly book club with here.",
    ),
    t(
      "La moderación marca la diferencia: se puede debatir sin malos rollos.",
      "The moderation makes all the difference: you can disagree without the drama.",
    ),
    t(
      "Pasamos de un grupo de chat caótico a una comunidad ordenada en una semana.",
      "We went from a chaotic group chat to an organized community in a week.",
    ),
  ],
  roles: [t("Miembro desde 2023", "Member since 2023"), t("Organizadora de eventos", "Event organizer"), t("Moderador", "Moderator")],
  pricing: {
    period: "month",
    plans: [
      {
        name: t("Miembro", "Member"),
        price: 0,
        description: t("Para participar y conocer gente.", "To join in and meet people."),
        features: [t("Acceso a los debates", "Access to discussions"), t("Eventos abiertos", "Open events"), t("Perfil público", "Public profile")],
      },
      {
        name: t("Socio", "Supporter"),
        price: 5,
        description: t("Para quien quiere apoyar la comunidad.", "For those who want to support the community."),
        features: [
          t("Todo lo de Miembro", "Everything in Member"),
          t("Eventos exclusivos", "Exclusive events"),
          t("Insignia de socio", "Supporter badge"),
          t("Archivo completo", "Full archive"),
        ],
      },
      {
        name: t("Organizador", "Organizer"),
        price: 29,
        description: t("Para crear y gestionar tu comunidad.", "To build and run your own community."),
        features: [
          t("Tu propia comunidad", "Your own community"),
          t("Herramientas de moderación", "Moderation tools"),
          t("Venta de entradas", "Ticketing"),
          t("Estadísticas de participación", "Engagement analytics"),
        ],
      },
    ],
    note: t("Sin permanencia.", "No commitment."),
  },
  cta: {
    titles: [t("Hay un sitio para ti", "There's a place for you here"), t("Tu comunidad te está esperando", "Your community is waiting")],
    subtitle: t("Crea tu perfil en {name} y preséntate hoy.", "Create your {name} profile and say hello today."),
    button: t("Unirme ahora", "Join now"),
  },
  kpis: [
    { id: "members", label: t("Miembros activos", "Active members"), format: "number", min: 3000, max: 24000, deltaMax: 11, icon: "users" },
    { id: "posts", label: t("Publicaciones esta semana", "Posts this week"), format: "number", min: 400, max: 3800, deltaMax: 15, icon: "edit" },
    { id: "attendees", label: t("Asistentes a eventos", "Event attendees"), format: "number", min: 120, max: 980, deltaMax: 18, icon: "calendar" },
    { id: "reply-rate", label: t("Tasa de respuesta", "Reply rate"), format: "percent", min: 48, max: 86, deltaMax: 6, icon: "mail" },
  ],
  chart: {
    title: t("Actividad semanal", "Weekly activity"),
    period: "week",
    series: [t("Publicaciones", "Posts"), t("Respuestas", "Replies")],
    format: "number",
    min: 200,
    max: 2400,
  },
  table: {
    title: t("Miembros recientes", "Newest members"),
    columns: [
      { key: "member", label: t("Miembro", "Member"), kind: "person" },
      {
        key: "group",
        label: t("Grupo", "Group"),
        kind: "choice",
        options: [t("Diseño", "Design"), t("Fotografía", "Photography"), t("Running", "Running"), t("Lectura", "Books"), t("Cocina", "Cooking")],
      },
      { key: "posts", label: t("Publicaciones", "Posts"), kind: "number", min: 0, max: 140 },
      {
        key: "status",
        label: t("Estado", "Status"),
        kind: "status",
        options: [
          { label: t("Activo", "Active"), tone: "success", weight: 5 },
          { label: t("Nuevo", "New"), tone: "info", weight: 3 },
          { label: t("Inactivo", "Inactive"), tone: "neutral", weight: 1 },
          { label: t("Silenciado", "Muted"), tone: "warning", weight: 1 },
        ],
      },
      { key: "joined", label: t("Alta", "Joined"), kind: "date" },
    ],
  },
  activity: [
    {
      text: t("publicó en {target}", "posted in {target}"),
      targets: [t("Fotografía", "Photography"), t("Lectura", "Books")],
      tone: "info",
      icon: "edit",
    },
    {
      text: t("creó el evento {target}", "created the event {target}"),
      targets: [t("Quedada de otoño", "Fall meetup")],
      tone: "info",
      icon: "calendar",
    },
    {
      text: t("dio la bienvenida a {target}", "welcomed {target}"),
      targets: [t("12 nuevos miembros", "12 new members")],
      tone: "success",
      icon: "users",
    },
    {
      text: t("respondió en {target}", "replied in {target}"),
      targets: [t("¿Qué estáis leyendo?", "What are you reading?")],
      tone: "neutral",
      icon: "mail",
    },
    {
      text: t("reportó {target}", "reported {target}"),
      targets: [t("un comentario", "a comment")],
      tone: "warning",
      icon: "alert-triangle",
    },
  ],
  appNav: [
    { icon: "home", label: t("Inicio", "Home") },
    { icon: "mail", label: t("Debates", "Discussions") },
    { icon: "calendar", label: t("Eventos", "Events") },
    { icon: "users", label: t("Miembros", "Members") },
    { icon: "bar-chart", label: t("Estadísticas", "Insights") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
