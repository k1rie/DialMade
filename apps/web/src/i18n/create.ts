import { defineDictionary } from "./config";

type CardState = { selected: boolean; recommended: boolean; created: boolean };

/** Paso «¿Qué quieres crear?» (CreateStep). Los nombres y el «Para ti si…» de cada salida vienen de @dialmade/catalog. */
export const create = defineDictionary({
  es: {
    title: "¿Qué quieres crear?",
    subtitle: "Las tres ya llevan tu marca. Elige por dónde empezar; las otras las añades después.",
    options: "Qué puedes crear",
    forYouIf: "Para ti si",
    kinds: {
      brand: [
        "Tu logo en claro, en oscuro y sobre tu color",
        "Paleta con escalas y contraste AA",
        "Tipografía, formas y componentes",
      ],
      landing: [
        "Nav, hero y features con tu marca",
        "Testimonios, precios y llamada a la acción",
        "Editable por secciones, con variantes",
      ],
      app: [
        "Sidebar, KPIs, gráfica y tabla de ejemplo",
        "Componentes con todos sus estados",
        "Datos de ejemplo según tu producto",
      ],
    },
    badges: {
      recommended: "Recomendada",
      created: "Ya creada",
    },
    cardLabel: (label: string, state: CardState) =>
      [label, state.selected && "elegida", state.recommended && "recomendada", state.created && "ya creada"].filter(Boolean).join(", "),
    slot: {
      label: "el lienzo",
      region: "Lienzo: arrastra aquí lo que quieres crear",
      hint: "Arrastra aquí lo que quieres crear",
      hintAlt: "o haz clic en una carta",
      compatible: (kind: string) => `Suelta aquí para crear ${kind}`,
      over: (kind: string) => `Suelta para elegir ${kind}`,
      youCreate: "Vas a crear",
      youOpen: "Vas a abrir",
      withBrand: (name: string) => `Con la marca «${name}». Lo ajustas en el siguiente paso.`,
    },
    recommend: {
      toggle: "¿No sabes cuál?",
      result: (kind: string) => `Te recomendamos ${kind}.`,
    },
    details: {
      title: "Detalles",
      optional: "Opcional",
      description: "Los usamos para el contenido de ejemplo. Puedes cambiarlos después.",
      name: "Nombre de la marca",
      namePlaceholder: "Mi marca",
      tagline: "Tagline",
      taglinePlaceholder: "Una frase que diga qué haces",
      productType: "Tipo de producto",
      productHint: "Cambia el texto, los datos de ejemplo y el estilo de partida.",
      productHintExisting: "Las páginas que ya creaste conservan su texto.",
    },
    cta: (kind: string) => `Crear ${kind}`,
    open: (kind: string) => `Abrir ${kind}`,
    ctaNote: "Sin IA. Las otras las añades cuando quieras.",
    back: "Volver a la marca",
    announce: {
      selected: (kind: string) => `Has elegido ${kind}.`,
      recommended: (kind: string) => `Te recomendamos ${kind}. Ya está elegida.`,
    },
  },
  en: {
    title: "What do you want to create?",
    subtitle: "All three already wear your brand. Pick where to start; add the others later.",
    options: "What you can create",
    forYouIf: "For you if",
    kinds: {
      brand: [
        "Your logo on light, on dark and on your color",
        "Palette with scales and AA contrast",
        "Typography, shapes and components",
      ],
      landing: [
        "Nav, hero and features with your brand",
        "Testimonials, pricing and a call to action",
        "Editable section by section, with variants",
      ],
      app: [
        "Sidebar, KPIs, chart and a sample table",
        "Components in every state",
        "Sample data that fits your product",
      ],
    },
    badges: {
      recommended: "Recommended",
      created: "Already created",
    },
    cardLabel: (label: string, state: CardState) =>
      [label, state.selected && "selected", state.recommended && "recommended", state.created && "already created"].filter(Boolean).join(", "),
    slot: {
      label: "the canvas",
      region: "Canvas: drag here what you want to create",
      hint: "Drag here what you want to create",
      hintAlt: "or click a card",
      compatible: (kind: string) => `Drop here to create ${kind}`,
      over: (kind: string) => `Release to choose ${kind}`,
      youCreate: "You'll create",
      youOpen: "You'll open",
      withBrand: (name: string) => `With the “${name}” brand. You'll fine-tune it next.`,
    },
    recommend: {
      toggle: "Not sure which?",
      result: (kind: string) => `We recommend ${kind}.`,
    },
    details: {
      title: "Details",
      optional: "Optional",
      description: "We use them for the sample content. You can change them later.",
      name: "Brand name",
      namePlaceholder: "My brand",
      tagline: "Tagline",
      taglinePlaceholder: "One line that says what you do",
      productType: "Product type",
      productHint: "Changes the copy, the sample data and the starting style.",
      productHintExisting: "Pages you already created keep their text.",
    },
    cta: (kind: string) => `Create ${kind}`,
    open: (kind: string) => `Open ${kind}`,
    ctaNote: "No AI. Add the others whenever you want.",
    back: "Back to brand",
    announce: {
      selected: (kind: string) => `You chose ${kind}.`,
      recommended: (kind: string) => `We recommend ${kind}. It's now selected.`,
    },
  },
});

export type CreateDictionary = (typeof create)["es"];
