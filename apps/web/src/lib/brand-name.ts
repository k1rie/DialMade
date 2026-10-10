const MAX_NAME = 80;
const GENERIC = /^(logo|logotipo|logotype|image|imagen|img|icon|icono|untitled|sin titulo|download|descarga|brand|marca|final|copy|copia|screenshot|captura|pasted|clipboard)$/;
const NOISE = /\b(logo|logotipo|logotype|final|copy|copia|v\d+|\d+x|@\dx|icon|isotipo|isologo)\b/gi;

/**
 * A readable brand name from a logo file name (`brisa-logo_v2.svg` → `Brisa`), or `undefined` when
 * the name says nothing (`logo.png`, `IMG_2031.jpg`, `image (3).webp`).
 */
export function brandNameFromFile(fileName: string | undefined): string | undefined {
  if (!fileName) return undefined;
  const base = fileName
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/\(\d+\)/g, " ")
    .replace(/[_\-.+]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  const cleaned = base.replace(NOISE, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || !/\p{L}/u.test(cleaned) || /^(img|dsc|pxl|screenshot)\s?\d/i.test(cleaned) || GENERIC.test(cleaned.toLowerCase())) {
    return undefined;
  }
  const name = cleaned.charAt(0).toLocaleUpperCase() + cleaned.slice(1);
  return name.slice(0, MAX_NAME).trim();
}
