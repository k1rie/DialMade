import { googleFontsCss2Url, typographyPairings, type FontRequest } from "@dialmade/catalog";

function deckFontsUrl(): string {
  const weights = new Map<string, Set<number>>();
  for (const pairing of typographyPairings) {
    for (const face of [pairing.heading, pairing.body]) {
      const set = weights.get(face.family) ?? new Set<number>();
      face.weights.forEach((weight) => set.add(weight));
      weights.set(face.family, set);
    }
  }
  const requests: FontRequest[] = [...weights].map(([family, set]) => ({ family, weights: [...set].sort((a, b) => a - b) }));
  return googleFontsCss2Url(requests);
}

const DECK_FONTS_URL = deckFontsUrl();

/**
 * One stylesheet with every catalog pairing, so the typography and theme cards show «Aa» in the real
 * fonts. Font files only download for the faces that are actually painted.
 */
export function DeckFonts() {
  return <link rel="stylesheet" href={DECK_FONTS_URL} />;
}
