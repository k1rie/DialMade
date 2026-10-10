import { t } from "../t";
import type { ContentProfile } from "../types";

export const publicSector: ContentProfile = {
  id: "public",
  b2b: false,
  hero: {
    eyebrows: [t("Transparencia y participación", "Transparency and participation"), t("Para todas las personas", "For everyone")],
    titles: [
      t("Hacemos fácil lo importante", "Making what matters easy"),
      t("Cerca de las personas, abiertos a todos", "Close to people, open to all"),
      t("Juntos llegamos más lejos", "Together we go further"),
    ],
    subtitles: [
      t(
        "{name} acerca servicios, información y formas de participar a todas las personas, con trámites claros y accesibles.",
        "{name} brings services, information and ways to take part to everyone, with clear and accessible processes.",
      ),
      t(
        "Información transparente, resultados medibles y una comunidad que se implica.",
        "Transparent information, measurable results and a community that gets involved.",
      ),
    ],
    primaryCta: t("Participa", "Get involved"),
    secondaryCta: t("Conoce el proyecto", "Learn about us"),
  },
  landingNav: [t("Qué hacemos", "What we do"), t("Participa", "Get involved"), t("Transparencia", "Transparency"), t("Contacto", "Contact")],
  proofTitle: t("Entidades que colaboran con {name}", "Organizations that partner with {name}"),
  featuresHeading: {
    title: t("Qué hacemos", "What we do"),
    subtitle: t("Servicios pensados para todas las personas.", "Services designed for everyone."),
  },
  features: [
    {
      icon: "file",
      title: t("Trámites en línea", "Online services"),
      description: t(
        "Solicitudes y gestiones desde casa, con seguimiento paso a paso.",
        "Requests and paperwork from home, with step-by-step tracking.",
      ),
    },
    {
      icon: "check-circle",
      title: t("Accesible para todos", "Accessible to everyone"),
      description: t(
        "Lenguaje claro, lectura fácil y compatibilidad con lectores de pantalla.",
        "Plain language, easy-read versions and screen reader support.",
      ),
    },
    {
      icon: "bar-chart",
      title: t("Transparencia", "Transparency"),
      description: t(
        "Datos abiertos y cuentas claras sobre cada euro invertido.",
        "Open data and clear accounts of every dollar spent.",
      ),
    },
    {
      icon: "users",
      title: t("Participación", "Participation"),
      description: t(
        "Propuestas, votaciones y voluntariado a un clic.",
        "Proposals, votes and volunteering one click away.",
      ),
    },
    {
      icon: "calendar",
      title: t("Agenda abierta", "Open calendar"),
      description: t(
        "Actividades, convocatorias y plazos siempre actualizados.",
        "Activities, open calls and deadlines, always up to date.",
      ),
    },
    {
      icon: "mail",
      title: t("Atención cercana", "Real help"),
      description: t(
        "Resolvemos tus dudas por teléfono, por correo o en persona.",
        "We answer your questions by phone, email or in person.",
      ),
    },
  ],
  stats: [
    { value: 48000, suffix: "+", label: t("personas atendidas", "people served") },
    { value: 320, label: t("proyectos financiados", "projects funded") },
    { value: 94, format: "percent", label: t("de los fondos va a programas", "of funds go to programs") },
  ],
  quotes: [
    t(
      "Hice todo el trámite desde casa y pude seguir cada paso. Así debería ser siempre.",
      "I handled the whole process from home and could follow every step. It should always be like this.",
    ),
    t(
      "Como voluntaria, ver el impacto con datos claros me anima a seguir.",
      "As a volunteer, seeing the impact in clear numbers keeps me going.",
    ),
    t("Todo está explicado para que cualquiera lo entienda.", "Everything is explained so anyone can understand it."),
  ],
  roles: [t("Vecina", "Resident"), t("Voluntaria", "Volunteer"), t("Coordinador de programas", "Program coordinator")],
  pricing: {
    period: "month",
    title: t("Hazte socio", "Become a member"),
    subtitle: t("Tu aportación mensual sostiene nuestros programas.", "Your monthly gift keeps our programs running."),
    plans: [
      {
        name: t("Amigo", "Friend"),
        price: 5,
        description: t("Un pequeño gesto que suma.", "A small gesture that adds up."),
        features: [t("Boletín trimestral", "Quarterly newsletter"), t("Informe de impacto anual", "Annual impact report")],
      },
      {
        name: t("Colaborador", "Supporter"),
        price: 15,
        description: t("Nuestra cuota más elegida.", "Our most popular level."),
        features: [
          t("Todo lo de Amigo", "Everything in Friend"),
          t("Visitas a los proyectos", "Project visits"),
          t("Certificado de donación", "Donation certificate"),
        ],
      },
      {
        name: t("Mecenas", "Patron"),
        price: 50,
        description: t("Para quien quiere ir más lejos.", "For those who want to go further."),
        features: [
          t("Todo lo de Colaborador", "Everything in Supporter"),
          t("Encuentros con el equipo", "Meetings with the team"),
          t("Reconocimiento en la memoria anual", "Recognition in the annual report"),
        ],
      },
    ],
    note: t("Las donaciones pueden desgravar según tu país.", "Donations may be tax-deductible depending on your country."),
  },
  cta: {
    titles: [t("Súmate al cambio", "Be part of the change"), t("Tu ayuda llega más lejos de lo que crees", "Your help goes further than you think")],
    subtitle: t("Hazte socio de {name} o colabora como voluntario. Cada gesto cuenta.", "Become a {name} member or volunteer. Every bit counts."),
    button: t("Quiero colaborar", "I want to help"),
  },
  kpis: [
    { id: "requests", label: t("Solicitudes recibidas", "Requests received"), format: "number", min: 800, max: 5200, deltaMax: 10, icon: "inbox" },
    {
      id: "resolution",
      label: t("Tiempo medio de resolución", "Avg. resolution time"),
      format: "decimal",
      min: 2,
      max: 9,
      deltaMax: 12,
      invert: true,
      unit: t(" días", " days"),
      icon: "calendar",
    },
    { id: "volunteers", label: t("Personas voluntarias", "Volunteers"), format: "number", min: 120, max: 940, deltaMax: 12, icon: "users" },
    { id: "funds", label: t("Fondos recaudados", "Funds raised"), format: "currency", min: 40000, max: 260000, deltaMax: 15, icon: "bar-chart" },
  ],
  chart: {
    title: t("Solicitudes por mes", "Requests per month"),
    period: "month",
    series: [t("En línea", "Online"), t("Presenciales", "In person")],
    format: "number",
    min: 120,
    max: 980,
  },
  table: {
    title: t("Solicitudes recientes", "Recent requests"),
    columns: [
      { key: "case", label: t("Expediente", "Case"), kind: "id", prefix: "EXP-", start: 2048 },
      { key: "applicant", label: t("Solicitante", "Applicant"), kind: "person" },
      {
        key: "type",
        label: t("Tipo", "Type"),
        kind: "choice",
        options: [
          t("Ayuda social", "Social assistance"),
          t("Licencia", "Permit"),
          t("Subvención", "Grant"),
          t("Inscripción", "Registration"),
          t("Certificado", "Certificate"),
        ],
      },
      {
        key: "status",
        label: t("Estado", "Status"),
        kind: "status",
        options: [
          { label: t("Resuelta", "Resolved"), tone: "success", weight: 4 },
          { label: t("En trámite", "In progress"), tone: "info", weight: 3 },
          { label: t("Falta documentación", "Missing documents"), tone: "warning", weight: 2 },
          { label: t("Denegada", "Denied"), tone: "destructive", weight: 1 },
        ],
      },
      { key: "date", label: t("Fecha", "Date"), kind: "date" },
    ],
  },
  activity: [
    {
      text: t("registró {target}", "filed {target}"),
      targets: [t("una solicitud de subvención", "a grant application")],
      tone: "info",
      icon: "file",
    },
    {
      text: t("resolvió {target}", "resolved {target}"),
      targets: [t("el expediente EXP-2041", "case EXP-2041")],
      tone: "success",
      icon: "check-circle",
    },
    {
      text: t("publicó {target}", "published {target}"),
      targets: [t("la convocatoria de otoño", "the fall open call")],
      tone: "info",
      icon: "calendar",
    },
    {
      text: t("pidió {target}", "requested {target}"),
      targets: [t("documentación adicional", "additional documents")],
      tone: "warning",
      icon: "alert-triangle",
    },
    {
      text: t("se apuntó a {target}", "signed up for {target}"),
      targets: [t("el voluntariado del sábado", "Saturday's volunteering")],
      tone: "success",
      icon: "users",
    },
  ],
  appNav: [
    { icon: "home", label: t("Inicio", "Home") },
    { icon: "inbox", label: t("Solicitudes", "Requests") },
    { icon: "calendar", label: t("Convocatorias", "Open calls") },
    { icon: "users", label: t("Personas", "People") },
    { icon: "bar-chart", label: t("Transparencia", "Transparency") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
