import { t } from "../t";
import type { ContentProfile } from "../types";

export const services: ContentProfile = {
  id: "services",
  b2b: false,
  hero: {
    eyebrows: [t("Reserva online en un minuto", "Book online in a minute"), t("Atención cercana", "Personal service")],
    titles: [
      t("Reserva fácil, servicio impecable", "Easy booking, flawless service"),
      t("Cerca de ti, cuando nos necesitas", "Close by, whenever you need us"),
      t("Tu tiempo vale: reserva sin esperas", "Your time matters: book without the wait"),
    ],
    subtitles: [
      t(
        "En {name} eliges día y hora en segundos, recibes la confirmación al momento y llegas sabiendo qué esperar.",
        "At {name} you pick a day and time in seconds, get instant confirmation and arrive knowing what to expect.",
      ),
      t(
        "Profesionales con experiencia, precios claros y la tranquilidad de un trabajo bien hecho.",
        "Experienced professionals, clear prices and the peace of mind of a job well done.",
      ),
    ],
    primaryCta: t("Reservar ahora", "Book now"),
    secondaryCta: t("Ver servicios", "See services"),
  },
  landingNav: [t("Servicios", "Services"), t("Precios", "Pricing"), t("Opiniones", "Reviews"), t("Contacto", "Contact")],
  proofTitle: t("Nos recomiendan", "As recommended by"),
  featuresHeading: {
    title: t("Por qué elegirnos", "Why choose us"),
    subtitle: t("Lo que hace que vuelvas.", "The little things that bring you back."),
  },
  features: [
    {
      icon: "calendar",
      title: t("Reserva 24/7", "Book 24/7"),
      description: t("Consulta la disponibilidad real y reserva a cualquier hora.", "Check real availability and book at any hour."),
    },
    {
      icon: "bell",
      title: t("Recordatorios", "Reminders"),
      description: t("Te avisamos el día antes para que no se te pase.", "We remind you the day before so you don't forget."),
    },
    {
      icon: "check-circle",
      title: t("Precios claros", "Clear pricing"),
      description: t("Sabes lo que pagas antes de confirmar. Sin sorpresas.", "You know what you'll pay before you confirm. No surprises."),
    },
    {
      icon: "users",
      title: t("Equipo con experiencia", "Experienced team"),
      description: t("Profesionales formados que cuidan cada detalle.", "Trained professionals who take care of every detail."),
    },
    {
      icon: "home",
      title: t("Cerca de ti", "Close to you"),
      description: t("Encuéntranos fácilmente o pide que vayamos nosotros.", "Find us easily or ask us to come to you."),
    },
    {
      icon: "sparkle",
      title: t("Programa de fidelidad", "Loyalty program"),
      description: t(
        "Acumula puntos en cada visita y canjéalos por descuentos.",
        "Earn points every visit and redeem them for discounts.",
      ),
    },
  ],
  stats: [
    { value: 15000, suffix: "+", label: t("reservas al año", "bookings a year") },
    { value: 4.9, format: "decimal", suffix: "/5", label: t("en reseñas", "in reviews") },
    { value: 15, label: t("años de experiencia", "years of experience") },
  ],
  quotes: [
    t("Reservé en un minuto desde el móvil y fueron puntualísimos.", "I booked in a minute on my phone and they were right on time."),
    t("Trato cercano y precios claros. Ya es mi sitio de confianza.", "Friendly service and clear prices. It's my go-to place now."),
    t("El recordatorio del día antes me ha salvado más de una vez.", "The day-before reminder has saved me more than once."),
  ],
  roles: [t("Cliente habitual", "Regular customer"), t("Vecina del barrio", "Local resident"), t("Cliente desde 2021", "Customer since 2021")],
  pricing: {
    period: "once",
    title: t("Servicios y precios", "Services and prices"),
    subtitle: t("Sin letra pequeña: el precio que ves es el que pagas.", "No fine print: the price you see is the price you pay."),
    plans: [
      {
        name: t("Básico", "Basic"),
        price: 25,
        description: t("Nuestro servicio estándar.", "Our standard service."),
        features: [t("Servicio estándar", "Standard service"), t("Reserva online", "Online booking"), t("Confirmación inmediata", "Instant confirmation")],
      },
      {
        name: t("Completo", "Complete"),
        price: 45,
        description: t("El favorito de nuestros clientes.", "Our customers' favorite."),
        features: [
          t("Todo lo del Básico", "Everything in Basic"),
          t("Atención prioritaria", "Priority service"),
          t("Revisión gratuita", "Free follow-up"),
          t("Puntos dobles", "Double points"),
        ],
      },
      {
        name: t("Bono 5 visitas", "5-visit pass"),
        price: 180,
        description: t("Para quien repite.", "For regulars."),
        features: [t("Cinco servicios completos", "Five complete services"), t("Ahorra un 20 %", "Save 20%"), t("Válido 12 meses", "Valid for 12 months")],
      },
    ],
    note: t("Precios con impuestos incluidos.", "Prices include taxes."),
  },
  cta: {
    titles: [t("Reserva tu cita en un minuto", "Book your visit in a minute"), t("Te estamos esperando", "We're ready for you")],
    subtitle: t("Elige el servicio, el día y la hora. {name} se encarga del resto.", "Choose the service, day and time. {name} takes care of the rest."),
    button: t("Reservar cita", "Book a visit"),
  },
  kpis: [
    { id: "bookings", label: t("Reservas de hoy", "Today's bookings"), format: "number", min: 12, max: 58, deltaMax: 12, icon: "calendar" },
    { id: "revenue", label: t("Ingresos de la semana", "Revenue this week"), format: "currency", min: 3200, max: 18000, deltaMax: 10, icon: "bar-chart" },
    { id: "occupancy", label: t("Ocupación", "Occupancy"), format: "percent", min: 58, max: 94, deltaMax: 6, icon: "users" },
    { id: "cancellations", label: t("Cancelaciones", "Cancellations"), format: "percent", min: 2, max: 9, deltaMax: 15, invert: true, icon: "alert-triangle" },
  ],
  chart: {
    title: t("Reservas por día", "Bookings per day"),
    period: "day",
    series: [t("Online", "Online"), t("Teléfono", "Phone")],
    format: "number",
    min: 8,
    max: 64,
  },
  table: {
    title: t("Reservas de hoy", "Today's bookings"),
    columns: [
      { key: "time", label: t("Hora", "Time"), kind: "time" },
      { key: "customer", label: t("Cliente", "Customer"), kind: "person" },
      {
        key: "service",
        label: t("Servicio", "Service"),
        kind: "choice",
        options: [
          t("Servicio estándar", "Standard service"),
          t("Servicio completo", "Complete service"),
          t("Revisión", "Follow-up"),
          t("Primera visita", "First visit"),
          t("Urgente", "Urgent"),
        ],
      },
      {
        key: "status",
        label: t("Estado", "Status"),
        kind: "status",
        options: [
          { label: t("Confirmada", "Confirmed"), tone: "success", weight: 5 },
          { label: t("Pendiente", "Pending"), tone: "warning", weight: 2 },
          { label: t("Completada", "Completed"), tone: "info", weight: 2 },
          { label: t("No presentado", "No-show"), tone: "destructive", weight: 1 },
        ],
      },
      { key: "amount", label: t("Importe", "Amount"), kind: "money", min: 25, max: 180 },
    ],
  },
  activity: [
    {
      text: t("reservó {target}", "booked {target}"),
      targets: [t("un servicio completo para el viernes", "a complete service for Friday")],
      tone: "info",
      icon: "calendar",
    },
    {
      text: t("valoró {target} con 5 estrellas", "rated {target} 5 stars"),
      targets: [t("su última visita", "their last visit")],
      tone: "success",
      icon: "sparkle",
    },
    {
      text: t("canceló {target}", "canceled {target}"),
      targets: [t("la cita de las 17:00", "the 5:00 PM booking")],
      tone: "warning",
      icon: "alert-triangle",
    },
    {
      text: t("pagó {target}", "paid for {target}"),
      targets: [t("el bono de 5 visitas", "the 5-visit pass")],
      tone: "success",
      icon: "check-circle",
    },
    {
      text: t("movió {target}", "moved {target}"),
      targets: [t("su cita al martes", "their visit to Tuesday")],
      tone: "neutral",
      icon: "edit",
    },
  ],
  appNav: [
    { icon: "home", label: t("Inicio", "Home") },
    { icon: "calendar", label: t("Agenda", "Calendar") },
    { icon: "users", label: t("Clientes", "Customers") },
    { icon: "folder", label: t("Servicios", "Services") },
    { icon: "bar-chart", label: t("Informes", "Reports") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
