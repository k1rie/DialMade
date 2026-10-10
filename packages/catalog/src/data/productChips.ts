import type { ProductChip } from "../types";

// Los 12 tipos de producto más habituales entre devs, más «generic». Cada id es el de un ProductType.
export const productChips: readonly ProductChip[] = [
  { id: "saas-general", label: { es: "SaaS", en: "SaaS" } },
  { id: "analytics-dashboard", label: { es: "Dashboard y analítica", en: "Dashboard & analytics" } },
  { id: "e-commerce", label: { es: "E-commerce", en: "E-commerce" } },
  { id: "portfolio-personal", label: { es: "Portfolio", en: "Portfolio" } },
  { id: "fintech-crypto", label: { es: "Fintech", en: "Fintech" } },
  { id: "healthcare-app", label: { es: "Salud", en: "Health" } },
  { id: "online-course-e-learning", label: { es: "Educación", en: "Education" } },
  { id: "ai-chatbot-platform", label: { es: "IA y dev tools", en: "AI & dev tools" } },
  { id: "membership-community", label: { es: "Comunidad", en: "Community" } },
  { id: "creative-agency", label: { es: "Agencia", en: "Agency" } },
  { id: "restaurant-food-service", label: { es: "Restaurante o local", en: "Restaurant & local business" } },
  { id: "habit-tracker", label: { es: "App móvil", en: "Mobile app" } },
  { id: "generic", label: { es: "Otro", en: "Something else" } },
];
