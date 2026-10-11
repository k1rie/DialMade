// Curación de los temas importados (daisyUI y tweakcn). Lo que el ETL no puede decidir solo.

/**
 * Presets de tweakcn que no entran: llevan el nombre de una marca o de un producto real. Las reglas del repo
 * (INFORME §8: «referencias como atributos, no como plantillas») piden no meter identidades ajenas con su nombre.
 * Sus valores son genéricos, pero el nombre los ata a la marca, así que se descartan en lugar de renombrarse.
 */
export const DROPPED_TWEAKCN = {
  twitter: "nombre de marca",
  "t3-chat": "nombre de producto",
  supabase: "nombre de marca",
  claude: "nombre de producto",
  vercel: "nombre de marca",
  "doom-64": "título de videojuego",
};

/** Etiquetas de daisyUI que no salen bien de capitalizar el nombre del archivo. */
export const DAISYUI_LABELS = {
  cmyk: "CMYK",
  lofi: "Lo-Fi",
  caramellatte: "Caramel Latte",
};

export function titleCase(key) {
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
