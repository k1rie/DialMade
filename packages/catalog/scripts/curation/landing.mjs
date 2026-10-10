// Los 6 layouts curados a partir de los 34 patrones de landing.csv.
// `patterns` lista los Pattern ID que cada layout cubre. El ETL exige que cada patrón esté en exactamente uno.
export const LANDING_SECTIONS = [
  "landing.navbar",
  "landing.hero",
  "landing.socialProof",
  "landing.features",
  "landing.testimonials",
  "landing.pricing",
  "landing.cta",
  "landing.footer",
];

export const DEFAULT_LANDING_LAYOUT_ID = "feature-rich";

export const LANDING_LAYOUTS = [
  {
    id: "minimal",
    label: { es: "Minimal", en: "Minimal" },
    description: {
      es: "Una columna: titular, tres beneficios y un CTA claro.",
      en: "One column: headline, three benefits and one clear CTA.",
    },
    sourcePatternId: "minimal-single-column",
    sections: ["navbar", "hero", "features", "cta", "footer"],
    patterns: [
      "minimal-single-column",
      "hero-centric-design",
      "hero-features-cta",
      "waitlist-coming-soon",
      "lead-magnet-form",
      "faq-documentation-landing",
      "newsletter-content-first",
      "webinar-registration",
    ],
  },
  {
    id: "product-demo",
    label: { es: "Demo de producto", en: "Product demo" },
    description: {
      es: "El producto en el centro: mockup grande, logos de confianza y features una a una.",
      en: "Product first: a large mockup, trust logos and features one by one.",
    },
    sourcePatternId: "product-demo-features",
    sections: ["navbar", "hero", "socialProof", "features", "cta", "footer"],
    patterns: [
      "product-demo-features",
      "video-first-hero",
      "app-store-style-landing",
      "immersive-interactive-experience",
      "interactive-3d-configurator",
      "ai-driven-dynamic-landing",
      "real-time-operations-landing",
    ],
  },
  {
    id: "social-proof",
    label: { es: "Prueba social", en: "Social proof" },
    description: {
      es: "Confianza antes que nada: logos, testimonios y resultados antes del CTA.",
      en: "Trust comes first: logos, testimonials and results before the CTA.",
    },
    sourcePatternId: "hero-testimonials-cta",
    sections: ["navbar", "hero", "socialProof", "features", "testimonials", "cta", "footer"],
    patterns: [
      "hero-testimonials-cta",
      "trust-authority-conversion",
      "product-review-ratings-focused",
      "community-forum-landing",
      "ai-personalization-landing",
    ],
  },
  {
    id: "storytelling",
    label: { es: "Narrativa", en: "Storytelling" },
    description: {
      es: "Una historia por capítulos: el problema, el camino y la solución.",
      en: "A story in chapters: the problem, the journey and the solution.",
    },
    sourcePatternId: "scroll-triggered-storytelling",
    sections: ["navbar", "hero", "features", "testimonials", "cta", "footer"],
    patterns: [
      "scroll-triggered-storytelling",
      "horizontal-scroll-journey",
      "before-after-transformation",
      "portfolio-grid",
    ],
  },
  {
    id: "conversion",
    label: { es: "Conversión y precios", en: "Conversion & pricing" },
    description: {
      es: "Pensada para convertir: beneficios, planes de precio y un CTA en cada paso.",
      en: "Built to convert: benefits, pricing plans and a CTA at every step.",
    },
    sourcePatternId: "pricing-focused-landing",
    sections: ["navbar", "hero", "features", "pricing", "testimonials", "cta", "footer"],
    patterns: [
      "pricing-focused-landing",
      "pricing-page-cta",
      "funnel-3-step-conversion",
      "comparison-table-cta",
      "comparison-table-focus",
    ],
  },
  {
    id: "feature-rich",
    label: { es: "Escaparate completo", en: "Full showcase" },
    description: {
      es: "Todas las secciones. Para cuando tienes mucho que contar y prefieres ocultar lo que sobre.",
      en: "Every section. For when you have a lot to show and would rather hide what you don't need.",
    },
    sourcePatternId: "feature-rich-showcase",
    sections: ["navbar", "hero", "socialProof", "features", "testimonials", "pricing", "cta", "footer"],
    patterns: [
      "feature-rich-showcase",
      "bento-grid-showcase",
      "enterprise-gateway",
      "marketplace-directory",
      "event-conference-landing",
    ],
  },
];

// Formas abreviadas que usa products.csv y que landing.csv solo recoge en su forma corta dentro de los alias.
export const PATTERN_NAME_NORMALIZATION = [
  ["Hero-Centric Design", "Hero-Centric"],
  ["Feature-Rich Showcase", "Feature-Rich"],
  ["Storytelling-Driven", "Storytelling"],
  ["Minimal & Direct", "Minimal"],
];
