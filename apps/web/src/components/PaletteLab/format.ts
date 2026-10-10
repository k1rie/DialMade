/** `#ff5a36` → `#FF5A36` (how hex values are shown everywhere in the lab). */
export const formatHex = (hex: string) => hex.toUpperCase();

/** `Brisa Café` → `brisacafe` (accents and symbols dropped): fake domains and export file names. */
export function brandSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return slug.slice(0, 24) || "brand";
}
