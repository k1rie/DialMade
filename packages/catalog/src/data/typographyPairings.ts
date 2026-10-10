import { googleFontsCss2Url } from "../googleFonts";
import type { TypographyPairing } from "../types";

const APPLE_SANS = "-apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', sans-serif";
const SANS = "ui-sans-serif, system-ui, 'Segoe UI', Roboto, sans-serif";
const SERIF = "ui-serif, Georgia, Cambria, 'Times New Roman', serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

type PairingInput = Omit<TypographyPairing, "googleFontsUrl">;

function pairing(input: PairingInput): TypographyPairing {
  return { ...input, googleFontsUrl: googleFontsCss2Url([input.heading, input.body]) };
}

// 10 pairings de Google Fonts curados a mano. Todas las familias salen de los pairings de uupm (data/fonts.json).
export const typographyPairings: readonly TypographyPairing[] = [
  pairing({
    id: "inter-neo-grotesque",
    label: { es: "Neo-grotesca (tipo Apple)", en: "Neo-grotesque (Apple-like)" },
    heading: { family: "Inter", weights: [500, 600, 700], fallback: APPLE_SANS },
    body: { family: "Inter", weights: [400, 500], fallback: APPLE_SANS },
    mood: ["neutral", "minimal", "clean", "precise", "professional"],
    sourcePairingId: "minimal-swiss",
  }),
  pairing({
    id: "editorial-serif",
    label: { es: "Serif editorial", en: "Editorial serif" },
    heading: { family: "Newsreader", weights: [400, 500, 600], fallback: SERIF },
    body: { family: "Inter", weights: [400, 500, 600], fallback: SANS },
    mood: ["editorial", "literary", "refined", "trustworthy", "reading"],
    sourcePairingId: "news-editorial",
  }),
  pairing({
    id: "geometric-modern",
    label: { es: "Geométrica moderna", en: "Geometric modern" },
    heading: { family: "Outfit", weights: [500, 600, 700], fallback: SANS },
    body: { family: "Work Sans", weights: [400, 500], fallback: SANS },
    mood: ["geometric", "modern", "balanced", "contemporary", "clean"],
    sourcePairingId: "geometric-modern",
  }),
  pairing({
    id: "mono-tech",
    label: { es: "Mono técnica", en: "Technical mono" },
    heading: { family: "JetBrains Mono", weights: [500, 700], fallback: MONO },
    body: { family: "IBM Plex Sans", weights: [400, 500, 600], fallback: SANS },
    mood: ["technical", "developer", "precise", "code", "hacker"],
    sourcePairingId: "developer-mono",
  }),
  pairing({
    id: "grotesk-startup",
    label: { es: "Grotesca startup", en: "Startup grotesk" },
    heading: { family: "Space Grotesk", weights: [500, 600, 700], fallback: SANS },
    body: { family: "DM Sans", weights: [400, 500, 700], fallback: SANS },
    mood: ["startup", "bold", "modern", "tech", "confident"],
    sourcePairingId: "tech-startup",
  }),
  pairing({
    id: "rounded-friendly",
    label: { es: "Redondeada y amable", en: "Rounded and friendly" },
    heading: { family: "Fredoka", weights: [500, 600, 700], fallback: SANS },
    body: { family: "Nunito", weights: [400, 600, 700], fallback: SANS },
    mood: ["playful", "friendly", "warm", "fun", "approachable"],
    sourcePairingId: "playful-creative",
  }),
  pairing({
    id: "luxury-serif",
    label: { es: "Serif de lujo", en: "Luxury serif" },
    heading: { family: "Bodoni Moda", weights: [400, 500, 600], fallback: SERIF },
    body: { family: "Jost", weights: [300, 400, 500], fallback: SANS },
    mood: ["luxury", "elegant", "high-end", "fashion", "refined"],
    sourcePairingId: "luxury-minimalist",
  }),
  pairing({
    id: "humanist-calm",
    label: { es: "Humanista serena", en: "Calm humanist" },
    heading: { family: "Lora", weights: [500, 600], fallback: SERIF },
    body: { family: "Source Sans 3", weights: [400, 500, 600], fallback: SANS },
    mood: ["calm", "warm", "natural", "wellness", "trustworthy"],
    sourcePairingId: "wellness-calm",
  }),
  pairing({
    id: "plex-corporate",
    label: { es: "Corporativa sobria", en: "Sober corporate" },
    heading: { family: "IBM Plex Sans", weights: [500, 600, 700], fallback: SANS },
    body: { family: "IBM Plex Sans", weights: [400, 500], fallback: SANS },
    mood: ["corporate", "trustworthy", "serious", "financial", "clear"],
    sourcePairingId: "financial-trust",
  }),
  pairing({
    id: "jakarta-friendly",
    label: { es: "SaaS cercana", en: "Friendly SaaS" },
    heading: { family: "Plus Jakarta Sans", weights: [600, 700, 800], fallback: SANS },
    body: { family: "Plus Jakarta Sans", weights: [400, 500], fallback: SANS },
    mood: ["friendly", "modern", "saas", "approachable", "clean"],
    sourcePairingId: "friendly-saas",
  }),
];
