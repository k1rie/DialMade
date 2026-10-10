import { t } from "../t";
import type { ContentProfile } from "../types";

export const commerce: ContentProfile = {
  id: "commerce",
  b2b: false,
  hero: {
    eyebrows: [t("Envío gratis desde $50", "Free shipping over $50"), t("Nueva colección", "New collection")],
    titles: [
      t("Lo que buscas, a un clic", "What you're looking for, one click away"),
      t("Hecho para durar, pensado para ti", "Made to last, made for you"),
      t("Compra mejor, no más", "Buy better, not more"),
    ],
    subtitles: [
      t(
        "Descubre la selección de {name}: productos elegidos uno a uno, envío en 48 horas y devoluciones gratis durante 30 días.",
        "Discover {name}'s selection: hand-picked products, 48-hour shipping and free returns for 30 days.",
      ),
      t(
        "Calidad que se nota, precios claros y un equipo que responde de verdad.",
        "Quality you can feel, honest prices and a team that actually answers.",
      ),
    ],
    primaryCta: t("Ver la colección", "Shop the collection"),
    secondaryCta: t("Descubrir novedades", "See what's new"),
  },
  landingNav: [t("Novedades", "New in"), t("Colecciones", "Collections"), t("Nosotros", "About"), t("Ayuda", "Help")],
  proofTitle: t("Nos han recomendado en", "As featured in"),
  featuresHeading: {
    title: t("Comprar aquí es más fácil", "Shopping here is easier"),
    subtitle: t("Cuidamos cada detalle, del catálogo a tu puerta.", "We take care of every detail, from the catalog to your door."),
  },
  features: [
    {
      icon: "check-circle",
      title: t("Calidad seleccionada", "Curated quality"),
      description: t(
        "Probamos cada producto antes de venderlo. Si no nos convence, no entra en el catálogo.",
        "We test every product before selling it. If it doesn't convince us, it doesn't make the catalog.",
      ),
    },
    {
      icon: "arrow-right",
      title: t("Envío en 48 horas", "48-hour delivery"),
      description: t("Pedidos preparados el mismo día y seguimiento en tiempo real.", "Orders packed the same day, with real-time tracking."),
    },
    {
      icon: "inbox",
      title: t("Devoluciones gratis", "Free returns"),
      description: t("Tienes 30 días para cambiar de opinión, sin preguntas.", "You have 30 days to change your mind, no questions asked."),
    },
    {
      icon: "sparkle",
      title: t("Ediciones limitadas", "Limited editions"),
      description: t(
        "Colaboraciones y series cortas que no encontrarás en otro sitio.",
        "Collaborations and small batches you won't find anywhere else.",
      ),
    },
    {
      icon: "mail",
      title: t("Atención de personas reales", "Real people, real support"),
      description: t("Te ayudamos por chat o email en menos de dos horas.", "We help by chat or email in under two hours."),
    },
    {
      icon: "file",
      title: t("Pago seguro", "Secure checkout"),
      description: t("Paga con tarjeta o en tres plazos sin intereses.", "Pay by card or in three interest-free installments."),
    },
  ],
  stats: [
    { value: 85000, suffix: "+", label: t("clientes felices", "happy customers") },
    { value: 4.9, format: "decimal", suffix: "/5", label: t("en reseñas verificadas", "in verified reviews") },
    { value: 48, suffix: " h", label: t("de plazo de entrega", "delivery time") },
  ],
  quotes: [
    t(
      "El pedido llegó al día siguiente y el embalaje era impecable. Ya voy por mi tercera compra.",
      "My order arrived the next day, beautifully packed. I'm already on my third purchase.",
    ),
    t(
      "Cambié una talla sin coste y sin esperar semanas. Así da gusto comprar.",
      "I swapped a size for free without waiting weeks. That's how shopping should feel.",
    ),
    t(
      "Se nota que eligen cada producto con cuidado. Nada que ver con las grandes tiendas.",
      "You can tell they choose every product with care. Nothing like the big stores.",
    ),
  ],
  roles: [t("Cliente desde 2023", "Customer since 2023"), t("Compradora verificada", "Verified buyer"), t("Cliente habitual", "Repeat customer")],
  pricing: {
    period: "once",
    title: t("Elige tu pack", "Pick your bundle"),
    subtitle: t("Packs pensados para regalar o para darte un capricho.", "Bundles made for gifting or treating yourself."),
    plans: [
      {
        name: t("Esencial", "Essential"),
        price: 39,
        description: t("Lo básico, bien hecho.", "The basics, done right."),
        features: [t("2 productos a elegir", "2 products of your choice"), t("Envío gratis", "Free shipping"), t("Devoluciones en 30 días", "30-day returns")],
      },
      {
        name: t("Completo", "Complete"),
        price: 79,
        description: t("Nuestro pack más vendido.", "Our best-selling bundle."),
        features: [
          t("4 productos a elegir", "4 products of your choice"),
          t("Envío en 24 horas", "24-hour shipping"),
          t("Envoltorio de regalo", "Gift wrapping"),
          t("Devoluciones en 30 días", "30-day returns"),
        ],
      },
      {
        name: t("Premium", "Premium"),
        price: 129,
        description: t("Para quien lo quiere todo.", "For those who want it all."),
        features: [
          t("6 productos a elegir", "6 products of your choice"),
          t("Edición limitada incluida", "Limited edition included"),
          t("Envío urgente", "Express shipping"),
          t("Atención personal", "Personal shopper"),
        ],
      },
    ],
    note: t("IVA incluido. Envío gratis desde $50.", "Taxes included. Free shipping over $50."),
  },
  cta: {
    titles: [t("Tu próximo favorito te espera", "Your next favorite is waiting"), t("Únete y llévate un 10 %", "Join and get 10% off")],
    subtitle: t(
      "Suscríbete y recibe antes que nadie las novedades y ediciones limitadas de {name}.",
      "Subscribe to get {name}'s new arrivals and limited editions before anyone else.",
    ),
    button: t("Quiero el descuento", "Get my discount"),
  },
  kpis: [
    { id: "sales", label: t("Ventas", "Sales"), format: "currency", min: 18000, max: 96000, deltaMax: 18, icon: "bar-chart" },
    { id: "orders", label: t("Pedidos", "Orders"), format: "number", min: 420, max: 2600, deltaMax: 15, icon: "inbox" },
    { id: "aov", label: t("Ticket medio", "Average order value"), format: "currency", min: 38, max: 120, deltaMax: 8, icon: "file" },
    { id: "returns", label: t("Tasa de devolución", "Return rate"), format: "percent", min: 2, max: 9, deltaMax: 12, invert: true, icon: "arrow-down-right" },
  ],
  chart: {
    title: t("Ventas por canal", "Sales by channel"),
    period: "month",
    series: [t("Tienda online", "Online store"), t("Marketplace", "Marketplace")],
    format: "currency",
    min: 4000,
    max: 26000,
  },
  table: {
    title: t("Pedidos recientes", "Recent orders"),
    columns: [
      { key: "order", label: t("Pedido", "Order"), kind: "id", prefix: "#", start: 10482 },
      { key: "customer", label: t("Cliente", "Customer"), kind: "person" },
      { key: "items", label: t("Artículos", "Items"), kind: "number", min: 1, max: 6 },
      {
        key: "status",
        label: t("Estado", "Status"),
        kind: "status",
        options: [
          { label: t("Entregado", "Delivered"), tone: "success", weight: 5 },
          { label: t("Enviado", "Shipped"), tone: "info", weight: 3 },
          { label: t("Preparando", "Processing"), tone: "neutral", weight: 2 },
          { label: t("Devuelto", "Returned"), tone: "warning", weight: 1 },
        ],
      },
      { key: "total", label: t("Total", "Total"), kind: "money", min: 24, max: 480 },
      { key: "date", label: t("Fecha", "Date"), kind: "date" },
    ],
  },
  activity: [
    {
      text: t("hizo un pedido de {target}", "placed an order for {target}"),
      targets: [t("3 artículos", "3 items"), t("1 artículo", "1 item")],
      tone: "info",
      icon: "inbox",
    },
    {
      text: t("dejó una reseña de 5 estrellas en {target}", "left a 5-star review on {target}"),
      targets: [t("Mochila Urbana", "Urban Backpack"), t("Taza de cerámica", "Ceramic Mug")],
      tone: "success",
      icon: "sparkle",
    },
    {
      text: t("solicitó la devolución de {target}", "requested a return for {target}"),
      targets: [t("el pedido #10419", "order #10419")],
      tone: "warning",
      icon: "alert-triangle",
    },
    {
      text: t("actualizó el stock de {target}", "updated stock for {target}"),
      targets: [t("Camiseta básica", "Basic Tee"), t("Bolsa de lino", "Linen Tote")],
      tone: "neutral",
      icon: "edit",
    },
    {
      text: t("lanzó la campaña {target}", "launched the campaign {target}"),
      targets: [t("Rebajas de otoño", "Fall sale")],
      tone: "info",
      icon: "mail",
    },
  ],
  appNav: [
    { icon: "home", label: t("Inicio", "Home") },
    { icon: "inbox", label: t("Pedidos", "Orders") },
    { icon: "folder", label: t("Productos", "Products") },
    { icon: "users", label: t("Clientes", "Customers") },
    { icon: "bar-chart", label: t("Analítica", "Analytics") },
    { icon: "sliders", label: t("Ajustes", "Settings") },
  ],
};
