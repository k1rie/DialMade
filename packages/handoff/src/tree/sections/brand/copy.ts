// Copy and constants of the brand board (Guía de estilo), as the components of `@dialmade/sections/src/brand`
// write them. `@dialmade/sections` does not export them, so they are mirrored here: keep both in sync.
import type { Locale } from "@dialmade/catalog";

type Localized = Record<Locale, string>;
const t = (es: string, en: string): Localized => ({ es, en });

export const COVER_TYPE = "brand.cover";

/** Names of the numbered sections of the board (`brand/lib/board.ts`). */
export const BOARD_SECTION_NAMES: Readonly<Record<string, Localized>> = {
  "brand.identity": t("Identidad", "Identity"),
  "brand.palette": t("Paleta", "Palette"),
  "brand.type": t("Tipografía", "Typography"),
  "brand.shape": t("Formas", "Shape"),
  "brand.components": t("Componentes", "Components"),
  "brand.artDirection": t("Dirección de arte", "Art direction"),
};

export const COVER_COPY = {
  es: { eyebrow: "Guía de estilo", type: "Tipografía", style: "Estilo", primary: "Color primario", motion: "Movimiento" },
  en: { eyebrow: "Style guide", type: "Typography", style: "Style", primary: "Primary color", motion: "Motion" },
} as const satisfies Record<Locale, unknown>;

export const IDENTITY_COPY = {
  es: {
    title: "El logo en cada superficie",
    intro: "Cómo se ve sobre claro, oscuro y su propio color, con la zona de respeto y el tamaño mínimo que necesita.",
    surfaces: { light: "Sobre claro", dark: "Sobre oscuro", brand: "Sobre color de marca" },
    clearSpace: "Zona de respeto",
    clearSpaceBody: {
      monogram: "Deja libre alrededor del logo al menos x, la mitad del alto del símbolo. Ni texto ni bordes entran en esa zona.",
      image: "Deja libre alrededor del logo al menos x, una cuarta parte de su alto. Ni texto ni bordes entran en esa zona.",
    },
    minSize: "Tamaño mínimo",
    minSizeBody: "Por debajo de 24 px de alto el logo pierde detalle: a ese tamaño, usa solo el símbolo.",
    minLabel: "mín.",
    versions: "Versiones",
    versionNames: { lockup: "Horizontal", stacked: "Vertical", symbol: "Símbolo", wordmark: "Solo nombre" },
  },
  en: {
    title: "The logo on every surface",
    intro: "How it looks on light, dark and its own color, with the clear space and minimum size it needs.",
    surfaces: { light: "On light", dark: "On dark", brand: "On brand color" },
    clearSpace: "Clear space",
    clearSpaceBody: {
      monogram: "Keep at least x free around the logo, half the height of the symbol. No text or edges go inside that area.",
      image: "Keep at least x free around the logo, a quarter of its height. No text or edges go inside that area.",
    },
    minSize: "Minimum size",
    minSizeBody: "Below 24 px tall the logo loses detail: at that size, use the symbol alone.",
    minLabel: "min.",
    versions: "Versions",
    versionNames: { lockup: "Horizontal", stacked: "Stacked", symbol: "Symbol", wordmark: "Wordmark" },
  },
} as const satisfies Record<Locale, unknown>;

export const PALETTE_COPY = {
  es: {
    title: "Color con contraste verificado",
    intro: "Roles semánticos en claro y oscuro, escalas de 50 a 950 y los pares de texto comprobados con WCAG AA.",
    light: "Claro",
    dark: "Oscuro",
    scales: "Escalas 50–950",
    anchor: "paso ancla",
    roles: "Roles en claro y oscuro",
    role: "Rol",
    charts: "Gráficas",
    contrast: (mode: string) => `Contraste WCAG en modo ${mode.toLowerCase()}`,
    sample: "Muestra",
    pair: "Par",
    ratio: "Contraste",
    required: "Mínimo",
    result: "Resultado",
    pass: "Pasa",
    fail: "Falla",
    on: "sobre",
    summary: (mode: string, passed: number, total: number) => `${mode}: ${passed}/${total} pares AA`,
  },
  en: {
    title: "Color with verified contrast",
    intro: "Semantic roles in light and dark, 50–950 scales and text pairs checked against WCAG AA.",
    light: "Light",
    dark: "Dark",
    scales: "Scales 50–950",
    anchor: "anchor step",
    roles: "Roles in light and dark",
    role: "Role",
    charts: "Charts",
    contrast: (mode: string) => `WCAG contrast in ${mode.toLowerCase()} mode`,
    sample: "Sample",
    pair: "Pair",
    ratio: "Contrast",
    required: "Minimum",
    result: "Result",
    pass: "Pass",
    fail: "Fail",
    on: "on",
    summary: (mode: string, passed: number, total: number) => `${mode}: ${passed}/${total} AA pairs`,
  },
} as const satisfies Record<Locale, unknown>;

/** Display names of the color roles (camelCase keys, as in `theme.light`). */
export const ROLE_NAMES: Readonly<Record<string, Localized>> = {
  background: t("Papel", "Paper"),
  foreground: t("Tinta", "Ink"),
  card: t("Tarjeta", "Card"),
  cardForeground: t("Texto en tarjeta", "Card text"),
  popover: t("Popover", "Popover"),
  popoverForeground: t("Texto en popover", "Popover text"),
  primary: t("Primario", "Primary"),
  primaryForeground: t("Sobre primario", "On primary"),
  secondary: t("Secundario", "Secondary"),
  secondaryForeground: t("Sobre secundario", "On secondary"),
  muted: t("Superficie", "Surface"),
  mutedForeground: t("Texto secundario", "Muted text"),
  accent: t("Tinte de marca", "Brand tint"),
  accentForeground: t("Sobre tinte", "On tint"),
  destructive: t("Destructivo", "Destructive"),
  destructiveForeground: t("Sobre destructivo", "On destructive"),
  border: t("Borde", "Border"),
  input: t("Borde de campo", "Input border"),
  ring: t("Foco", "Focus ring"),
  brand: t("Marca exacta", "Exact brand"),
  cta: t("Llamada a la acción", "Call to action"),
  ctaForeground: t("Sobre CTA", "On CTA"),
  primaryText: t("Texto de marca", "Brand text"),
  borderStrong: t("Borde fuerte", "Strong border"),
  success: t("Éxito", "Success"),
  successForeground: t("Sobre éxito", "On success"),
  warning: t("Aviso", "Warning"),
  warningForeground: t("Sobre aviso", "On warning"),
  info: t("Información", "Info"),
  infoForeground: t("Sobre información", "On info"),
  chart1: t("Gráfica 1", "Chart 1"),
  chart2: t("Gráfica 2", "Chart 2"),
  chart3: t("Gráfica 3", "Chart 3"),
  chart4: t("Gráfica 4", "Chart 4"),
  chart5: t("Gráfica 5", "Chart 5"),
};

/** The big chips: the colors that define the brand at a glance. */
export const CHIP_ROLES = ["primary", "cta", "foreground", "background", "muted", "accent"] as const;

/** Rows of the roles table; `charts` is one row with chart-1…5. */
export const TABLE_ROLES = [
  "background",
  "foreground",
  "card",
  "primary",
  "primaryForeground",
  "primaryText",
  "secondary",
  "muted",
  "mutedForeground",
  "accent",
  "cta",
  "ctaForeground",
  "border",
  "borderStrong",
  "ring",
  "destructive",
  "success",
  "warning",
  "info",
  "charts",
] as const;

export const CHART_ROLES = ["chart1", "chart2", "chart3", "chart4", "chart5"] as const;

/** Pairs shown in the contrast table (all of them count in the summary). */
export const KEY_PAIRS = [
  "foreground/background",
  "mutedForeground/background",
  "cardForeground/card",
  "primaryForeground/primary",
  "primaryText/background",
  "ctaForeground/cta",
  "secondaryForeground/secondary",
  "destructiveForeground/destructive",
  "successForeground/success",
  "warningForeground/warning",
  "infoForeground/info",
  "borderStrong/background",
  "ring/background",
] as const;

export const SCALE_GROUPS = ["brand", "cta", "neutral", "success", "warning", "error", "info"] as const;
export type ScaleGroup = (typeof SCALE_GROUPS)[number];

export const SCALE_NAMES: Readonly<Record<ScaleGroup, Localized>> = {
  brand: t("Marca", "Brand"),
  cta: t("CTA", "CTA"),
  neutral: t("Neutro", "Neutral"),
  success: t("Éxito", "Success"),
  warning: t("Aviso", "Warning"),
  error: t("Error", "Error"),
  info: t("Info", "Info"),
};

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export const TYPE_COPY = {
  es: {
    title: "Titulares, texto y escala",
    intro: "La pareja tipográfica, la escala con sus tamaños reales y los pesos disponibles.",
    headings: "Titulares",
    body: "Texto",
    scale: "Escala tipográfica",
    weights: "Pesos",
    glyphs: "Caracteres",
    mono: "Monoespaciada",
    systemMono: "Monoespaciada del sistema",
    categories: { serif: "Serif", sans: "Sans serif", mono: "Monoespaciada", display: "Display" },
    steps: { display: "Display", h1: "Título 1", h2: "Título 2", h3: "Título 3", body: "Cuerpo", small: "Pequeño", caption: "Leyenda" },
    weightNames: {
      100: "Fina",
      200: "Extraligera",
      300: "Ligera",
      400: "Regular",
      500: "Media",
      600: "Seminegrita",
      700: "Negrita",
      800: "Extranegrita",
      900: "Negra",
    } as Record<number, string>,
  },
  en: {
    title: "Headlines, text and scale",
    intro: "The type pairing, the scale at its real sizes and the available weights.",
    headings: "Headlines",
    body: "Text",
    scale: "Type scale",
    weights: "Weights",
    glyphs: "Characters",
    mono: "Monospace",
    systemMono: "System monospace",
    categories: { serif: "Serif", sans: "Sans serif", mono: "Monospace", display: "Display" },
    steps: { display: "Display", h1: "Heading 1", h2: "Heading 2", h3: "Heading 3", body: "Body", small: "Small", caption: "Caption" },
    weightNames: {
      100: "Thin",
      200: "ExtraLight",
      300: "Light",
      400: "Regular",
      500: "Medium",
      600: "SemiBold",
      700: "Bold",
      800: "ExtraBold",
      900: "Black",
    } as Record<number, string>,
  },
} as const satisfies Record<Locale, unknown>;

export const GLYPHS = ["ABCDEFGHIJKLMNÑOPQRSTUVWXYZ", "abcdefghijklmnñopqrstuvwxyz", "0123456789 ¿?¡!&@#%€$*()"] as const;

export const SHAPE_COPY = {
  es: {
    title: "Radios, sombras y ritmo",
    intro: "Las reglas de forma que heredan todos los componentes: esquinas, elevación, bordes y espaciado.",
    radius: "Radios",
    elevation: "Elevación",
    noShadows: "Esta dirección no usa sombras: separa con bordes y superficies.",
    flat: "Plano",
    borders: "Bordes y foco",
    border: "Borde",
    borderStrong: "Borde fuerte",
    focus: "Anillo de foco",
    spacing: "Espaciado",
    controls: "Controles y densidad",
    controlHeights: "Alturas de control",
    dials: { density: "Densidad", variance: "Variación", motion: "Movimiento" },
    tableRow: "Fila de tabla",
    cardPadding: "Relleno de tarjeta",
  },
  en: {
    title: "Radii, shadows and rhythm",
    intro: "The shape rules every component inherits: corners, elevation, borders and spacing.",
    radius: "Radii",
    elevation: "Elevation",
    noShadows: "This direction uses no shadows: it separates with borders and surfaces.",
    flat: "Flat",
    borders: "Borders and focus",
    border: "Border",
    borderStrong: "Strong border",
    focus: "Focus ring",
    spacing: "Spacing",
    controls: "Controls and density",
    controlHeights: "Control heights",
    dials: { density: "Density", variance: "Variance", motion: "Motion" },
    tableRow: "Table row",
    cardPadding: "Card padding",
  },
} as const satisfies Record<Locale, unknown>;

export const COMPONENTS_COPY = {
  es: {
    title: "La marca aplicada a la interfaz",
    intro: "Botones, campos, etiquetas, tarjetas y tablas construidos con los tokens de esta guía.",
    buttons: "Botones",
    form: "Formulario",
    badges: "Etiquetas y avatares",
    email: "Correo electrónico",
    emailPlaceholder: "tu@empresa.com",
    emailHint: "Te enviaremos el enlace de acceso.",
    company: "Empresa",
    companyError: "Escribe el nombre de tu empresa.",
    plan: "Plan",
    create: "Nuevo",
    notifications: "Avisos por correo",
    terms: "Acepto las condiciones",
    delete: "Eliminar",
    more: "Más opciones",
    search: "Buscar",
    disabled: "Desactivado",
    popular: "Popular",
    statuses: { active: "Activo", pending: "Pendiente", fresh: "Nuevo", overdue: "Vencido", draft: "Borrador", beta: "Beta" },
    states: "Estados interactivos",
    component: "Componente",
    stateNames: { default: "Normal", hover: "Hover", focus: "Foco", active: "Pulsado", disabled: "Desactivado" },
    variants: { primary: "Primario", secondary: "Secundario", outline: "Contorno", ghost: "Fantasma", cta: "CTA" },
    field: "Campo",
    checkbox: "Casilla",
    switch: "Interruptor",
    buttonLabel: "Continuar",
  },
  en: {
    title: "The brand applied to the interface",
    intro: "Buttons, fields, badges, cards and tables built with this guide's tokens.",
    buttons: "Buttons",
    form: "Form",
    badges: "Badges and avatars",
    email: "Email",
    emailPlaceholder: "you@company.com",
    emailHint: "We'll send you a sign-in link.",
    company: "Company",
    companyError: "Enter your company name.",
    plan: "Plan",
    create: "New",
    notifications: "Email notifications",
    terms: "I accept the terms",
    delete: "Delete",
    more: "More options",
    search: "Search",
    disabled: "Disabled",
    popular: "Popular",
    statuses: { active: "Active", pending: "Pending", fresh: "New", overdue: "Overdue", draft: "Draft", beta: "Beta" },
    states: "Interactive states",
    component: "Component",
    stateNames: { default: "Default", hover: "Hover", focus: "Focus", active: "Pressed", disabled: "Disabled" },
    variants: { primary: "Primary", secondary: "Secondary", outline: "Outline", ghost: "Ghost", cta: "CTA" },
    field: "Field",
    checkbox: "Checkbox",
    switch: "Switch",
    buttonLabel: "Continue",
  },
} as const satisfies Record<Locale, unknown>;

export const ART_COPY = {
  es: {
    title: "Cómo se siente la marca",
    intro: "Degradados y texturas que salen del color de marca, qué hacer y qué evitar, y la marca aplicada.",
    mosaic: "Degradados y texturas",
    tiles: {
      key: { name: "Visual clave", recipe: "brand 300 → 900" },
      glow: { name: "Brillo", recipe: "brand 500 · neutral 950" },
      mesh: { name: "Malla suave", recipe: "brand 200 · cta 200" },
      dots: { name: "Puntos", recipe: "brand 500 · 16 px" },
      grid: { name: "Retícula", recipe: "brand 200 · 24 px" },
    },
    do: "Haz",
    dont: "Evita",
    dos: [
      "Usa el primario para una sola acción principal por pantalla.",
      "Deja respirar el logo: respeta su zona de respeto.",
      "Combina titulares y texto solo con la pareja tipográfica de esta guía.",
    ],
    donts: [
      "No pongas texto sobre un color sin un par AA de la paleta.",
      "No deformes, gires ni recolorees el logo.",
      "No mezcles radios ni sombras de otras direcciones.",
    ],
    applications: "Aplicaciones",
    landing: "Landing page",
    app: "Dashboard",
  },
  en: {
    title: "How the brand feels",
    intro: "Gradients and textures drawn from the brand color, do's and don'ts, and the brand in use.",
    mosaic: "Gradients and textures",
    tiles: {
      key: { name: "Key visual", recipe: "brand 300 → 900" },
      glow: { name: "Glow", recipe: "brand 500 · neutral 950" },
      mesh: { name: "Soft mesh", recipe: "brand 200 · cta 200" },
      dots: { name: "Dots", recipe: "brand 500 · 16 px" },
      grid: { name: "Grid", recipe: "brand 200 · 24 px" },
    },
    do: "Do",
    dont: "Don't",
    dos: [
      "Use the primary color for one main action per screen.",
      "Give the logo room: keep its clear space.",
      "Pair headlines and text only with this guide's type pairing.",
    ],
    donts: [
      "Don't set text on a color without an AA pair from the palette.",
      "Don't stretch, rotate or recolor the logo.",
      "Don't mix in radii or shadows from other directions.",
    ],
    applications: "Applications",
    landing: "Landing page",
    app: "Dashboard",
  },
} as const satisfies Record<Locale, unknown>;
