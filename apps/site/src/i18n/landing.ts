import type { BlockId } from "@/lib/blocks";
import { defineDictionary } from "./config";

type Step = { n: string; word: string; title: string; body: string };
type Feature = { title: string; body: string; tag: string };

/** Landing de marketing: todas las secciones de la página. */
export const landing = defineDictionary<{
  nav: { label: string; layout: string; how: string; features: string; openSource: string; github: string };
  hero: {
    eyebrow: string;
    title: [string, string];
    subtitle: string;
    primary: string;
    secondary: string;
    exportsLabel: string;
    exports: string[];
  };
  blocks: Record<BlockId, string>;
  demo: {
    eyebrow: string;
    title: [string, string];
    body: string;
    points: string[];
    canvasLabel: string;
    windowTitle: string;
    pageLabel: string;
    library: string;
    /** Template: `{block}`. */
    add: string;
    /** Template: `{block}`. */
    remove: string;
    device: string;
    desktop: string;
    mobile: string;
    brand: string;
    generate: string;
    showLayout: string;
    reset: string;
    empty: string;
    cursor: string;
    note: string;
    /** Template: `{max}`. Shown and announced when the canvas is full. */
    full: string;
    /** Screen reader announcements. Templates: `{block}`, `{brand}`. */
    live: {
      added: string;
      removed: string;
      generated: string;
      layout: string;
      reset: string;
    };
  };
  how: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: [Step, Step, Step, Step, Step];
    art: {
      addBlock: string;
      navigate: string;
      select: string;
      logo: string;
      importGuide: string;
      contrast: string;
      generate: string;
      variance: string;
      density: string;
      motion: string;
      editText: string;
      editSample: string;
      link: string;
      code: string;
    };
  };
  features: { eyebrow: string; title: string; subtitle: string; items: Feature[] };
  oss: {
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
    terminal: string;
    copy: string;
    copied: string;
    copyFailed: string;
    star: string;
  };
  finalCta: { title: string; body: string; primary: string; secondary: string };
  footer: {
    tagline: string;
    product: string;
    project: string;
    license: string;
    contribute: string;
    language: string;
    fictitious: string;
    rights: string;
  };
}>({
  es: {
    nav: {
      label: "Navegación principal",
      layout: "Modo Layout",
      how: "Cómo funciona",
      features: "Funciones",
      openSource: "Open source",
      github: "GitHub",
    },
    hero: {
      eyebrow: "Open source · MIT",
      title: ["Dibuja tu layout.", "Llévate tu diseño."],
      subtitle:
        "Coloca bloques con nombre en un lienzo (navbar, calendario, tarjetas) y Dialmade los convierte en un diseño con tu marca.",
      primary: "Empieza tu layout",
      secondary: "Ver en GitHub",
      exportsLabel: "Exporta a",
      exports: ["Figma", "Claude Design", "Framer", "Código"],
    },
    blocks: {
      navbar: "Navbar",
      hero: "Hero",
      calendar: "Calendario",
      cards: "Tarjetas",
      pricing: "Precios",
      testimonials: "Testimonios",
      footer: "Pie de página",
    },
    demo: {
      eyebrow: "Modo Layout",
      title: ["Piensa en bloques.", "Genera con tu marca."],
      body: "Arma la estructura con rectángulos que tienen nombre. Dialmade sabe qué es cada uno y lo diseña con tu paleta, tu tipografía y tu estilo.",
      points: [
        "Una librería de bloques: navbar, hero, calendario, tarjetas, precios…",
        "Vista de escritorio y de móvil",
        "También sin IA: el diseño base es determinista",
      ],
      canvasLabel: "Lienzo de ejemplo del Modo Layout",
      windowTitle: "dialmade — lienzo",
      pageLabel: "Bloques de la página",
      library: "Bloques",
      add: "Añadir {block}",
      remove: "Quitar {block}",
      device: "Vista",
      desktop: "Escritorio",
      mobile: "Móvil",
      brand: "Marca",
      generate: "Generar",
      showLayout: "Ver layout",
      reset: "Volver al ejemplo",
      empty: "El lienzo está vacío. Añade un bloque desde la librería.",
      cursor: "Tú",
      note: "Demo en tu navegador. El Modo Layout está en desarrollo: hoy la app crea tu paleta desde el logo, te deja ajustarla y la exporta.",
      full: "El lienzo ya tiene {max} bloques. Quita uno para añadir otro.",
      live: {
        added: "Añadiste {block} al lienzo.",
        removed: "Quitaste {block} del lienzo.",
        generated: "Diseño generado con la marca {brand}.",
        layout: "Volviste al layout.",
        reset: "El lienzo volvió al ejemplo inicial.",
      },
    },
    how: {
      eyebrow: "Cómo funciona",
      title: "De rectángulos a diseño, en cinco pasos.",
      subtitle: "El lienzo es el centro. Todo lo demás le da contexto.",
      steps: [
        {
          n: "01",
          word: "Coloca",
          title: "Coloca bloques",
          body: "Arrástralos al lienzo (navbar, hero, calendario, tarjetas…) o añádelos con un clic o con el teclado. Cada rectángulo tiene nombre y sabe qué es.",
        },
        {
          n: "02",
          word: "Marca",
          title: "Pon tu marca",
          body: "Suelta tu logo y la paleta se genera en tu navegador, con contraste AA. Pronto también podrás traer tu marca.",
        },
        {
          n: "03",
          word: "Genera",
          title: "Genera el diseño",
          body: "Cada bloque se diseña con tu marca. Sin IA obtienes una base determinista; con tu API key, copy a medida.",
        },
        {
          n: "04",
          word: "Ajusta",
          title: "Ajusta sin pelearte",
          body: "Cambia la variante, la alineación, el énfasis y el espaciado de cada sección, mueve los dials de variación y densidad, edita los textos desde el panel y deshaz cuando quieras.",
        },
        {
          n: "05",
          word: "Exporta",
          title: "Expórtalo",
          body: "A Figma, Claude Design, Framer o código. El link para tu diseñador llega con las cuentas.",
        },
      ],
      art: {
        addBlock: "Añadir bloque",
        navigate: "Navegar",
        select: "Elegir",
        logo: "Tu logo",
        importGuide: "Trae tu marca · pronto",
        contrast: "AA",
        generate: "Generar",
        variance: "Variación",
        density: "Densidad",
        motion: "Movimiento",
        editText: "Texto",
        editSample: "Reserva tu clase",
        link: "Link · pronto",
        code: "Código",
      },
    },
    features: {
      eyebrow: "Funciones",
      title: "Todo lo demás, al servicio de tu layout.",
      subtitle: "Marca, IA, guía de estilo y exportación. Cada pieza alimenta el lienzo.",
      items: [
        {
          title: "Paleta desde tu logo",
          body: "Sacamos los colores en tu navegador, en OKLCH, con escalas 50–950 y roles para claro y oscuro.",
          tag: "local · ~1 s",
        },
        {
          title: "Trae tu marca",
          body: "¿Ya tienes marca? Pronto podrás traer tus tokens, tu guía o capturas de tu app, y Dialmade respetará lo que declaren.",
          tag: "pronto",
        },
        {
          title: "IA opcional",
          body: "Funciona completa sin IA. Si quieres copy a medida, usa tu propia key de Anthropic.",
          tag: "BYOK",
        },
        {
          title: "Guía de estilo",
          body: "Un brand board con paleta, tipografía, formas y componentes. Va en el ZIP de Código como HTML.",
          tag: "HTML en el ZIP",
        },
        {
          title: "Exporta a donde trabajas",
          body: "CSS listo para Tailwind v4, tokens DTCG, variables de Figma, DESIGN.md y prompts para Claude Design y Framer.",
          tag: "handoff",
        },
        {
          title: "Accesible por defecto",
          body: "Contraste AA, todo se usa con teclado y las animaciones respetan tu ajuste de movimiento reducido.",
          tag: "WCAG 2.2",
        },
      ],
    },
    oss: {
      eyebrow: "Open source",
      title: "Abierto, MIT y sin letra pequeña.",
      body: "Dialmade es de la comunidad. Lee el código, córrelo en local o mejóralo.",
      points: [
        "Licencia MIT",
        "Funciona sin IA y sin servicios de pago",
        "Tu logo no sale de tu navegador",
        "Hecho para devs que no son diseñadores",
      ],
      terminal: "terminal",
      copy: "Copiar comandos",
      copied: "Copiado",
      copyFailed: "No se pudo copiar",
      star: "Dale una estrella en GitHub",
    },
    finalCta: {
      title: "Tu próximo diseño empieza con un rectángulo.",
      body: "Abre el lienzo, coloca tu primer bloque y mira cómo toma tu marca.",
      primary: "Empieza tu layout",
      secondary: "Ver en GitHub",
    },
    footer: {
      tagline: "Dirección de diseño para devs.",
      product: "Producto",
      project: "Proyecto",
      license: "Licencia MIT",
      contribute: "Contribuir",
      language: "Idioma",
      fictitious: "Las marcas de los ejemplos son ficticias.",
      rights: "Open source bajo licencia MIT.",
    },
  },
  en: {
    nav: {
      label: "Main navigation",
      layout: "Layout Mode",
      how: "How it works",
      features: "Features",
      openSource: "Open source",
      github: "GitHub",
    },
    hero: {
      eyebrow: "Open source · MIT",
      title: ["Sketch your layout.", "Walk away with your design."],
      subtitle:
        "Place named blocks on a canvas (navbar, calendar, cards) and Dialmade turns them into an on-brand design.",
      primary: "Start your layout",
      secondary: "View on GitHub",
      exportsLabel: "Exports to",
      exports: ["Figma", "Claude Design", "Framer", "Code"],
    },
    blocks: {
      navbar: "Navbar",
      hero: "Hero",
      calendar: "Calendar",
      cards: "Cards",
      pricing: "Pricing",
      testimonials: "Testimonials",
      footer: "Footer",
    },
    demo: {
      eyebrow: "Layout Mode",
      title: ["Think in blocks.", "Generate with your brand."],
      body: "Build the structure with named rectangles. Dialmade knows what each one is and designs it with your palette, your type and your style.",
      points: [
        "A block library: navbar, hero, calendar, cards, pricing…",
        "Desktop and mobile views",
        "No AI needed: the base design is deterministic",
      ],
      canvasLabel: "Sample Layout Mode canvas",
      windowTitle: "dialmade — canvas",
      pageLabel: "Page blocks",
      library: "Blocks",
      add: "Add {block}",
      remove: "Remove {block}",
      device: "View",
      desktop: "Desktop",
      mobile: "Mobile",
      brand: "Brand",
      generate: "Generate",
      showLayout: "Show layout",
      reset: "Reset to example",
      empty: "The canvas is empty. Add a block from the library.",
      cursor: "You",
      note: "Runs in your browser. Layout Mode is still in progress: today the app builds a palette from your logo, lets you tune it and exports it.",
      full: "The canvas already has {max} blocks. Remove one to add another.",
      live: {
        added: "Added {block} to the canvas.",
        removed: "Removed {block} from the canvas.",
        generated: "Design generated with the {brand} brand.",
        layout: "Back to the layout.",
        reset: "The canvas is back to the starter example.",
      },
    },
    how: {
      eyebrow: "How it works",
      title: "From rectangles to a design, in five steps.",
      subtitle: "The canvas is the center. Everything else gives it context.",
      steps: [
        {
          n: "01",
          word: "Place",
          title: "Place blocks",
          body: "Drag them onto the canvas (navbar, hero, calendar, cards…) or add them with a click or the keyboard. Every rectangle has a name and knows what it is.",
        },
        {
          n: "02",
          word: "Brand",
          title: "Add your brand",
          body: "Drop your logo and the palette is built in your browser, with AA contrast. Bringing your existing brand is coming soon.",
        },
        {
          n: "03",
          word: "Generate",
          title: "Generate the design",
          body: "Each block is designed with your brand. Without AI you get a deterministic base; with your API key, tailored copy.",
        },
        {
          n: "04",
          word: "Tune",
          title: "Tune it without a fight",
          body: "Swap each section's variant, alignment, emphasis and spacing, move the variance and density dials, edit the copy from the panel and undo anytime.",
        },
        {
          n: "05",
          word: "Export",
          title: "Take it with you",
          body: "To Figma, Claude Design, Framer or code. A shareable link for your designer comes with accounts.",
        },
      ],
      art: {
        addBlock: "Add block",
        navigate: "Navigate",
        select: "Select",
        logo: "Your logo",
        importGuide: "Bring your brand · soon",
        contrast: "AA",
        generate: "Generate",
        variance: "Variance",
        density: "Density",
        motion: "Motion",
        editText: "Text",
        editSample: "Book your class",
        link: "Link · soon",
        code: "Code",
      },
    },
    features: {
      eyebrow: "Features",
      title: "Everything else serves your layout.",
      subtitle: "Brand, AI, style guide and exports. Each piece feeds the canvas.",
      items: [
        {
          title: "Palette from your logo",
          body: "We pull the colors in your browser, in OKLCH, with 50–950 scales and roles for light and dark.",
          tag: "local · ~1 s",
        },
        {
          title: "Bring your brand",
          body: "Already have a brand? Soon you'll bring your tokens, your guide or screenshots of your app, and Dialmade will keep what they declare.",
          tag: "soon",
        },
        {
          title: "Optional AI",
          body: "Works fully without AI. For tailored copy, use your own Anthropic key.",
          tag: "BYOK",
        },
        {
          title: "Style guide",
          body: "A brand board with palette, type, shapes and components. It ships in the Code ZIP as HTML.",
          tag: "HTML in the ZIP",
        },
        {
          title: "Export where you work",
          body: "Tailwind v4-ready CSS, DTCG tokens, Figma variables, DESIGN.md and prompts for Claude Design and Framer.",
          tag: "handoff",
        },
        {
          title: "Accessible by default",
          body: "AA contrast, full keyboard use, and motion that follows your reduced-motion setting.",
          tag: "WCAG 2.2",
        },
      ],
    },
    oss: {
      eyebrow: "Open source",
      title: "Open, MIT, no fine print.",
      body: "Dialmade belongs to the community. Read the code, run it locally or make it better.",
      points: [
        "MIT license",
        "Works without AI or paid services",
        "Your logo never leaves your browser",
        "Made for devs who aren't designers",
      ],
      terminal: "terminal",
      copy: "Copy commands",
      copied: "Copied",
      copyFailed: "Couldn't copy",
      star: "Star it on GitHub",
    },
    finalCta: {
      title: "Your next design starts with a rectangle.",
      body: "Open the canvas, place your first block and watch it take on your brand.",
      primary: "Start your layout",
      secondary: "View on GitHub",
    },
    footer: {
      tagline: "Design direction for devs.",
      product: "Product",
      project: "Project",
      license: "MIT license",
      contribute: "Contribute",
      language: "Language",
      fictitious: "The brands in the examples are fictitious.",
      rights: "Open source under the MIT license.",
    },
  },
});

export type LandingDictionary = (typeof landing)["es"];
/** The strings of the interactive Modo Layout demo, passed from the server section to the client demo. */
export type DemoStrings = LandingDictionary["demo"];
