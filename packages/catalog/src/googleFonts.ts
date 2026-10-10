export interface FontRequest {
  family: string;
  weights: readonly number[];
}

export const GOOGLE_FONTS_CSS2_ENDPOINT = "https://fonts.googleapis.com/css2";

/**
 * URL de la API css2 de Google Fonts con `display=swap`.
 * Une los pesos de una misma familia y ordena familias y pesos para que la URL sea estable.
 */
export function googleFontsCss2Url(requests: readonly FontRequest[]): string {
  const weightsByFamily = new Map<string, Set<number>>();
  for (const { family, weights } of requests) {
    const merged = weightsByFamily.get(family) ?? new Set<number>();
    for (const weight of weights) merged.add(weight);
    weightsByFamily.set(family, merged);
  }

  const families = [...weightsByFamily.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([family, weights]) => {
      const name = encodeURIComponent(family).replace(/%20/g, "+");
      const sorted = [...weights].sort((a, b) => a - b);
      return sorted.length > 0 ? `family=${name}:wght@${sorted.join(";")}` : `family=${name}`;
    });

  return `${GOOGLE_FONTS_CSS2_ENDPOINT}?${families.join("&")}&display=swap`;
}
