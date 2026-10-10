export type SampleLogoId = "brisa" | "monolito" | "solenne" | "puntal";

export type SampleLogo = {
  id: SampleLogoId;
  /** Fictional brand name. */
  name: string;
  /** Served from apps/web/public/samples. */
  src: string;
  /** Colors drawn in the SVG, for previews that should not decode the file. */
  colors: readonly string[];
};

/** Flat two-color sample; also the hero's before/after card. */
export const FEATURED_SAMPLE: SampleLogo = { id: "brisa", name: "Brisa", src: "/samples/brisa.svg", colors: ["#1B2A4A", "#FF5A36"] };

/** Four fictional logos that cover the extraction cases: flat two-color, black mono, gradient and small accent. */
export const SAMPLE_LOGOS: readonly SampleLogo[] = [
  FEATURED_SAMPLE,
  { id: "monolito", name: "Monolito", src: "/samples/monolito.svg", colors: ["#111111"] },
  { id: "solenne", name: "Solenne", src: "/samples/solenne.svg", colors: ["#E8436B", "#FF8A4C", "#FFC94A"] },
  { id: "puntal", name: "Puntal", src: "/samples/puntal.svg", colors: ["#23272F", "#12B886"] },
];

/** DnD type of the sample tiles; a DropSlot that accepts it receives `{ sampleId }` in `item.data`. */
export const SAMPLE_DRAG_TYPE = "sample-logo";

export const findSample = (id: string): SampleLogo | undefined => SAMPLE_LOGOS.find((sample) => sample.id === id);

/** Fetches the bundled SVG (same origin) and wraps it in a File, exactly as if the user had picked it. */
export async function loadSampleFile(sample: SampleLogo): Promise<File> {
  const response = await fetch(sample.src);
  if (!response.ok) throw new Error(`Sample ${sample.id}: HTTP ${response.status}`);
  const blob = await response.blob();
  return new File([blob], `${sample.id}.svg`, { type: "image/svg+xml" });
}
