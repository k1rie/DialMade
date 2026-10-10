import { t } from "../t";
import type { ContentProfile } from "../types";

export const health: ContentProfile = {
  id: "health",
  b2b: false,
  hero: {
    eyebrows: [t("Cuidado más cerca", "Care, closer to you"), t("Recomendado por profesionales", "Recommended by professionals")],
    titles: [
      t("Tu salud, en buenas manos", "Your health, in good hands"),
      t("Cuidarte nunca fue tan sencillo", "Taking care of yourself, made simple"),
      t("Menos esperas, más bienestar", "Less waiting, more wellbeing"),
    ],
    subtitles: [
      t(
        "Con {name} reservas citas, sigues tus hábitos y hablas con tu profesional desde un solo sitio, con tus datos protegidos.",
        "With {name} you book appointments, track your habits and talk to your care team from one place, with your data protected.",
      ),
      t(
        "Recordatorios amables, seguimiento claro y apoyo cuando lo necesitas.",
        "Gentle reminders, clear progress and support when you need it.",
      ),
    ],
    primaryCta: t("Reservar cita", "Book an appointment"),
    secondaryCta: t("Conocer el servicio", "Learn more"),
  },
  landingNav: [t("Servicios", "Services"), t("Profesionales", "Providers"), t("Precios", "Pricing"), t("Ayuda", "Help")],
  proofTitle: t("Centros y profesionales que trabajan con {name}", "Clinics and providers that work with {name}"),
  featuresHeading: {
    title: t("Cuidarte, sin complicaciones", "Care, without the hassle"),
    subtitle: t("Todo lo que necesitas para tu salud, en un solo lugar.", "Everything you need for your health, in one place."),
  },
  features: [
    {
      icon: "calendar",
      title: t("Citas en dos clics", "Book in two clicks"),
      description: t(
        "Elige profesional, día y hora. Recibe la confirmación al momento.",
        "Choose your provider, day and time. Get confirmation instantly.",
      ),
    },
    {
      icon: "bell",
      title: t("Recordatorios a tiempo", "Timely reminders"),
      description: t(
        "Avisos para tus citas, tu medicación y tus rutinas, sin agobiar.",
        "Reminders for appointments, medication and routines, without the nagging.",
      ),
    },
    {
      icon: "bar-chart",
      title: t("Tu progreso, a la vista", "Your progress, at a glance"),
      description: t(
        "Gráficas sencillas de sueño, actividad y ánimo para ver cómo evolucionas.",
        "Simple charts for sleep, activity and mood so you can see how you're doing.",
      ),
    },
    {
      icon: "mail",
      title: t("Consulta por mensaje", "Message your care team"),
      description: t("Resuelve dudas con tu profesional sin desplazarte.", "Get answers from your provider without leaving home."),
    },
    {
      icon: "file",
      title: t("Historial en un lugar", "Your records in one place"),
      description: t(
        "Informes, pruebas y recetas siempre a mano y fáciles de compartir.",
        "Reports, test results and prescriptions always at hand and easy to share.",
      ),
    },
    {
      icon: "check-circle",
      title: t("Privacidad ante todo", "Privacy first"),
      description: t(
        "Tus datos se cifran y solo los ve quien tú autorizas.",
        "Your data is encrypted and only visible to people you authorize.",
      ),
    },
  ],
  stats: [
    { value: 120000, suffix: "+", label: t("personas nos confían su salud", "people trust us with their health") },
    { value: 4.9, format: "decimal", suffix: "/5", label: t("valoración media", "average rating") },
    { value: 24, suffix: " h", label: t("hasta tu primera cita", "to your first appointment") },
  ],
  quotes: [
    t("Reservé desde el móvil en un minuto y me atendieron ese mismo día.", "I booked from my phone in a minute and was seen the same day."),
    t(
      "Los recordatorios me ayudan a no olvidar la medicación. Pequeño gesto, gran diferencia.",
      "The reminders help me never miss my medication. Small thing, big difference.",
    ),
    t("Ver mi progreso semana a semana me motiva a seguir.", "Seeing my progress week by week keeps me going."),
  ],
  roles: [t("Paciente", "Patient"), t("Médica de familia", "Family physician"), t("Usuario desde 2024", "Member since 2024"), t("Fisioterapeuta", "Physical therapist")],
  pricing: {
    period: "month",
    plans: [
      {
        name: t("Básico", "Basic"),
        price: 0,
        description: t("Para empezar a cuidarte.", "To start taking care of yourself."),
        features: [t("Reserva de citas", "Appointment booking"), t("Recordatorios", "Reminders"), t("Historial básico", "Basic records")],
      },
      {
        name: t("Plus", "Plus"),
        price: 9,
        description: t("Seguimiento cercano y sin esperas.", "Close follow-up, no waiting."),
        features: [
          t("Todo lo del plan Básico", "Everything in Basic"),
          t("Mensajes con tu profesional", "Messaging with your provider"),
          t("Informes de progreso", "Progress reports"),
          t("Reserva prioritaria", "Priority booking"),
        ],
      },
      {
        name: t("Familia", "Family"),
        price: 19,
        description: t("Para cuidar de toda la casa.", "To care for the whole household."),
        features: [
          t("Hasta 5 personas", "Up to 5 people"),
          t("Todo lo del plan Plus", "Everything in Plus"),
          t("Calendario compartido", "Shared calendar"),
          t("Soporte 24/7", "24/7 support"),
        ],
      },
    ],
    note: t("Puedes cancelar en cualquier momento.", "Cancel anytime."),
  },
  cta: {
    titles: [t("Empieza a cuidarte hoy", "Start taking care of yourself today"), t("Tu primera consulta, más cerca", "Your first visit, closer than you think")],
    subtitle: t("Crea tu cuenta en {name} y reserva en menos de dos minutos.", "Create your {name} account and book in under two minutes."),
    button: t("Crear mi cuenta", "Create my account"),
  },
  kpis: [
    { id: "appointments", label: t("Citas de hoy", "Today's appointments"), format: "number", min: 18, max: 64, deltaMax: 10, icon: "calendar" },
    { id: "patients", label: t("Pacientes activos", "Active patients"), format: "number", min: 800, max: 4200, deltaMax: 8, icon: "users" },
    { id: "wait-time", label: t("Espera media", "Avg. wait time"), format: "duration", min: 300, max: 1500, deltaMax: 15, invert: true, icon: "loader" },
    { id: "satisfaction", label: t("Satisfacción", "Satisfaction"), format: "percent", min: 88, max: 98, deltaMax: 4, icon: "check-circle" },
  ],
  chart: {
    title: t("Citas por semana", "Appointments per week"),
    period: "week",
    series: [t("Presenciales", "In person"), t("Online", "Online")],
    format: "number",
    min: 40,
    max: 220,
  },
  table: {
    title: t("Próximas citas", "Upcoming appointments"),
    columns: [
      { key: "time", label: t("Hora", "Time"), kind: "time" },
      { key: "patient", label: t("Paciente", "Patient"), kind: "person" },
      {
        key: "service",
        label: t("Servicio", "Service"),
        kind: "choice",
        options: [
          t("Medicina general", "General medicine"),
          t("Fisioterapia", "Physical therapy"),
          t("Nutrición", "Nutrition"),
          t("Psicología", "Counseling"),
          t("Revisión anual", "Annual checkup"),
        ],
      },
      { key: "mode", label: t("Modalidad", "Type"), kind: "choice", options: [t("Presencial", "In person"), t("Online", "Video")] },
      {
        key: "status",
        label: t("Estado", "Status"),
        kind: "status",
        options: [
          { label: t("Confirmada", "Confirmed"), tone: "success", weight: 5 },
          { label: t("Pendiente", "Pending"), tone: "warning", weight: 2 },
          { label: t("En sala", "Checked in"), tone: "info", weight: 2 },
          { label: t("Cancelada", "Canceled"), tone: "destructive", weight: 1 },
        ],
      },
    ],
  },
  activity: [
    {
      text: t("reservó {target}", "booked {target}"),
      targets: [t("una sesión de fisioterapia", "a physical therapy session"), t("una revisión anual", "an annual checkup")],
      tone: "info",
      icon: "calendar",
    },
    {
      text: t("completó {target}", "completed {target}"),
      targets: [t("su plan semanal", "their weekly plan")],
      tone: "success",
      icon: "check-circle",
    },
    {
      text: t("subió {target}", "uploaded {target}"),
      targets: [t("los resultados de una analítica", "lab results")],
      tone: "neutral",
      icon: "file",
    },
    {
      text: t("cambió la fecha de {target}", "rescheduled {target}"),
      targets: [t("la revisión del jueves", "Thursday's checkup")],
      tone: "warning",
      icon: "calendar",
    },
    {
      text: t("envió un mensaje sobre {target}", "sent a message about {target}"),
      targets: [t("la nueva pauta", "the new plan")],
      tone: "neutral",
      icon: "mail",
    },
  ],
  appNav: [
    { icon: "home", label: t("Inicio", "Home") },
    { icon: "calendar", label: t("Agenda", "Schedule") },
    { icon: "users", label: t("Pacientes", "Patients") },
    { icon: "mail", label: t("Mensajes", "Messages") },
    { icon: "file", label: t("Informes", "Records") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
