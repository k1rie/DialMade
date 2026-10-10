import type { ProductGroup } from "../types";

export const productGroups: readonly ProductGroup[] = [
  { id: "software", label: { es: "Software y SaaS", en: "Software & SaaS" } },
  { id: "data", label: { es: "Dashboards y datos", en: "Dashboards & data" } },
  { id: "developer", label: { es: "IA y herramientas para devs", en: "AI & developer tools" } },
  { id: "commerce", label: { es: "Comercio y marketplaces", en: "Commerce & marketplaces" } },
  { id: "finance", label: { es: "Finanzas", en: "Finance" } },
  { id: "health", label: { es: "Salud y bienestar", en: "Health & wellness" } },
  { id: "education", label: { es: "Educación e investigación", en: "Education & research" } },
  { id: "media", label: { es: "Medios y entretenimiento", en: "Media & entertainment" } },
  { id: "creative", label: { es: "Creatividad y portfolio", en: "Creative & portfolio" } },
  { id: "community", label: { es: "Comunidad y social", en: "Community & social" } },
  { id: "services", label: { es: "Servicios y negocio local", en: "Services & local business" } },
  { id: "travel", label: { es: "Viajes, hostelería y movilidad", en: "Travel, hospitality & mobility" } },
  { id: "personal", label: { es: "Apps personales y utilidades", en: "Personal & utility apps" } },
  { id: "games", label: { es: "Juegos", en: "Games" } },
  { id: "public", label: { es: "Sector público, ONG y cultura", en: "Public sector, nonprofits & culture" } },
  { id: "industry", label: { es: "Industria y deep tech", en: "Industry & deep tech" } },
  { id: "events", label: { es: "Eventos", en: "Events" } },
];
