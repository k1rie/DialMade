// Tiers de motion.csv → los 3 tiers del catálogo. Las curvas GSAP se traducen a cubic-bezier de CSS (no se usa GSAP).
export const MOTION_TIERS = [
  {
    source: "Subtle",
    id: "subtle",
    label: { es: "Sutil", en: "Subtle" },
    description: {
      es: "Feedback discreto: opacidad y desplazamientos de 1–2 px. Para productos serios o con mucho dato.",
      en: "Quiet feedback: opacity and 1–2 px shifts. For serious or data-heavy products.",
    },
  },
  {
    source: "Standard",
    id: "standard",
    label: { es: "Estándar", en: "Standard" },
    description: {
      es: "Transiciones claras: elevación en hover, revelado al hacer scroll y cambios de página suaves.",
      en: "Clear transitions: hover lift, scroll reveals and smooth page changes.",
    },
  },
  {
    source: "Complex",
    id: "expressive",
    label: { es: "Expresivo", en: "Expressive" },
    description: {
      es: "Movimiento con carácter: escalonados largos y curvas con inercia. Siempre respeta reduced motion.",
      en: "Motion with character: longer staggers and curves with momentum. Always honours reduced motion.",
    },
  },
];

export const EASE_FAMILIES_CSS = {
  power1: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  power2: "cubic-bezier(0.215, 0.61, 0.355, 1)",
  power3: "cubic-bezier(0.165, 0.84, 0.44, 1)",
  expo: "cubic-bezier(0.16, 1, 0.3, 1)",
  sine: "cubic-bezier(0.61, 1, 0.88, 1)",
  back: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};
