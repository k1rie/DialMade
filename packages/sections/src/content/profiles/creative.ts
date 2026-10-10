import { t } from "../t";
import type { ContentProfile } from "../types";

export const creative: ContentProfile = {
  id: "creative",
  b2b: true,
  hero: {
    eyebrows: [t("Estudio de diseño independiente", "Independent design studio"), t("Disponibles para nuevos proyectos", "Available for new projects")],
    titles: [
      t("Diseño con intención", "Design with intent"),
      t("Ideas que se ven, se usan y se recuerdan", "Ideas that are seen, used and remembered"),
      t("Hacemos marcas que la gente recuerda", "We build brands people remember"),
    ],
    subtitles: [
      t(
        "En {name} combinamos estrategia, diseño y desarrollo para lanzar marcas y productos digitales con criterio.",
        "At {name} we combine strategy, design and development to launch brands and digital products with care.",
      ),
      t(
        "Equipos pequeños, procesos claros y entregas que cumplen plazos.",
        "Small teams, clear processes and work delivered on schedule.",
      ),
    ],
    primaryCta: t("Hablemos de tu proyecto", "Let's talk about your project"),
    secondaryCta: t("Ver trabajos", "See our work"),
  },
  landingNav: [t("Trabajos", "Work"), t("Servicios", "Services"), t("Estudio", "Studio"), t("Contacto", "Contact")],
  proofTitle: t("Marcas con las que hemos trabajado", "Brands we've worked with"),
  featuresHeading: {
    title: t("Qué hacemos", "What we do"),
    subtitle: t("Un equipo, de la estrategia al lanzamiento.", "One team, from strategy to launch."),
  },
  features: [
    {
      icon: "sparkle",
      title: t("Identidad de marca", "Brand identity"),
      description: t(
        "Nombre, logotipo, voz y un sistema visual coherente en cada punto de contacto.",
        "Name, logo, voice and a visual system that holds together everywhere.",
      ),
    },
    {
      icon: "edit",
      title: t("Diseño de producto", "Product design"),
      description: t(
        "Interfaces claras, prototipos probados con usuarios y sistemas de diseño que escalan.",
        "Clear interfaces, user-tested prototypes and design systems that scale.",
      ),
    },
    {
      icon: "copy",
      title: t("Desarrollo web", "Web development"),
      description: t("Webs rápidas y accesibles, listas para que tu equipo las edite.", "Fast, accessible websites your team can edit."),
    },
    {
      icon: "bar-chart",
      title: t("Estrategia", "Strategy"),
      description: t(
        "Investigación, posicionamiento y objetivos medibles antes de abrir el editor.",
        "Research, positioning and measurable goals before opening the editor.",
      ),
    },
    {
      icon: "file",
      title: t("Contenido y dirección de arte", "Content and art direction"),
      description: t("Fotografía, ilustración y motion con una misma mirada.", "Photography, illustration and motion with one point of view."),
    },
    {
      icon: "users",
      title: t("Acompañamiento", "Ongoing partnership"),
      description: t(
        "Seguimos a tu lado después del lanzamiento para medir y mejorar.",
        "We stay with you after launch to measure and improve.",
      ),
    },
  ],
  stats: [
    { value: 140, suffix: "+", label: t("proyectos entregados", "projects delivered") },
    { value: 12, label: t("premios de diseño", "design awards") },
    { value: 9, label: t("años de estudio", "years in practice") },
  ],
  quotes: [
    t(
      "Entendieron nuestro negocio antes de diseñar nada. El resultado se nota en las ventas.",
      "They understood our business before designing anything. You can see it in our sales.",
    ),
    t(
      "Cumplieron cada plazo y el sistema de diseño sigue funcionando dos años después.",
      "They hit every deadline, and the design system still holds up two years later.",
    ),
    t("Trabajar con {name} fue fácil: comunicación clara y cero sorpresas.", "Working with {name} was easy: clear communication and zero surprises."),
  ],
  roles: [t("Directora de marketing", "Marketing Director"), t("Fundador", "Founder"), t("Responsable de producto", "Head of Product")],
  pricing: {
    period: "once",
    title: t("Formas de trabajar juntos", "Ways to work together"),
    subtitle: t("Precios de partida. Cada proyecto se presupuesta a medida.", "Starting prices. Every project gets a custom quote."),
    plans: [
      {
        name: t("Sprint de marca", "Brand sprint"),
        price: 4500,
        description: t("Dos semanas para dar forma a tu marca.", "Two weeks to shape your brand."),
        features: [t("Taller de estrategia", "Strategy workshop"), t("Logotipo y paleta", "Logo and palette"), t("Guía de estilo básica", "Basic style guide")],
      },
      {
        name: t("Lanzamiento", "Launch"),
        price: 12000,
        description: t("Marca y web listas para salir.", "Brand and website ready to go live."),
        features: [
          t("Todo lo del sprint de marca", "Everything in Brand sprint"),
          t("Web de hasta 8 páginas", "Website up to 8 pages"),
          t("Sistema de diseño", "Design system"),
          t("Un mes de soporte", "One month of support"),
        ],
      },
      {
        name: t("A medida", "Custom"),
        price: 20000,
        description: t("Un equipo dedicado para tu producto.", "A dedicated team for your product."),
        features: [
          t("Equipo dedicado", "Dedicated team"),
          t("Producto digital completo", "Full digital product"),
          t("Investigación con usuarios", "User research"),
          t("Soporte continuo", "Ongoing support"),
        ],
      },
    ],
    note: t("Impuestos no incluidos.", "Taxes not included."),
  },
  cta: {
    titles: [t("¿Tienes un proyecto en mente?", "Have a project in mind?"), t("Construyamos algo memorable", "Let's build something memorable")],
    subtitle: t(
      "Cuéntanos qué necesitas y te respondemos en 48 horas con una propuesta.",
      "Tell us what you need and we'll reply within 48 hours with a proposal.",
    ),
    button: t("Escríbenos", "Get in touch"),
  },
  kpis: [
    { id: "projects", label: t("Proyectos activos", "Active projects"), format: "number", min: 6, max: 18, deltaMax: 12, icon: "folder" },
    { id: "hours", label: t("Horas facturables", "Billable hours"), format: "number", min: 420, max: 1300, deltaMax: 8, icon: "calendar" },
    { id: "margin", label: t("Margen medio", "Avg. margin"), format: "percent", min: 22, max: 41, deltaMax: 6, icon: "bar-chart" },
    { id: "proposals", label: t("Propuestas enviadas", "Proposals sent"), format: "number", min: 4, max: 22, deltaMax: 20, icon: "mail" },
  ],
  chart: {
    title: t("Horas por mes", "Hours per month"),
    period: "month",
    series: [t("Diseño", "Design"), t("Desarrollo", "Development")],
    format: "number",
    min: 120,
    max: 620,
  },
  table: {
    title: t("Proyectos en curso", "Active projects"),
    columns: [
      {
        key: "project",
        label: t("Proyecto", "Project"),
        kind: "choice",
        unique: true,
        options: [
          t("Rebranding", "Rebrand"),
          t("Web corporativa", "Corporate website"),
          t("App de reservas", "Booking app"),
          t("Sistema de diseño", "Design system"),
          t("Campaña de lanzamiento", "Launch campaign"),
          t("Packaging", "Packaging"),
          t("Tienda online", "Online store"),
          t("Informe anual", "Annual report"),
        ],
      },
      { key: "client", label: t("Cliente", "Client"), kind: "company" },
      {
        key: "phase",
        label: t("Fase", "Phase"),
        kind: "status",
        options: [
          { label: t("En diseño", "In design"), tone: "info", weight: 3 },
          { label: t("En revisión", "In review"), tone: "warning", weight: 2 },
          { label: t("Entregado", "Delivered"), tone: "success", weight: 2 },
          { label: t("Descubrimiento", "Discovery"), tone: "neutral", weight: 2 },
        ],
      },
      { key: "budget", label: t("Presupuesto", "Budget"), kind: "money", min: 3000, max: 48000 },
      { key: "due", label: t("Entrega", "Due"), kind: "date" },
    ],
  },
  activity: [
    {
      text: t("subió {target}", "uploaded {target}"),
      targets: [t("la versión 3 del logotipo", "logo version 3")],
      tone: "info",
      icon: "file",
    },
    {
      text: t("aprobó {target}", "approved {target}"),
      targets: [t("los diseños de la home", "the homepage designs")],
      tone: "success",
      icon: "check-circle",
    },
    {
      text: t("dejó comentarios en {target}", "left feedback on {target}"),
      targets: [t("el prototipo", "the prototype")],
      tone: "neutral",
      icon: "edit",
    },
    {
      text: t("pasó a revisión {target}", "moved {target} to review"),
      targets: [t("el packaging", "the packaging")],
      tone: "warning",
      icon: "folder",
    },
    {
      text: t("envió la propuesta a {target}", "sent the proposal to {target}"),
      targets: [t("un nuevo cliente", "a new client")],
      tone: "info",
      icon: "mail",
    },
  ],
  appNav: [
    { icon: "home", label: t("Inicio", "Home") },
    { icon: "folder", label: t("Proyectos", "Projects") },
    { icon: "users", label: t("Clientes", "Clients") },
    { icon: "calendar", label: t("Planificación", "Planning") },
    { icon: "file", label: t("Facturas", "Invoices") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
