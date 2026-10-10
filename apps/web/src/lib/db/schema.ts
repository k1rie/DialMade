// Kysely types of the app's own tables (Better Auth's are typed by Better Auth). See
// supabase/migrations/*_auth_designs.sql.
import type { ColumnType, Generated } from "kysely";

/** Small summary of a DesignDoc for the «Mis diseños» cards, computed by the server (`summarizeDesign`). */
export type DesignPreview = {
  primary: string;
  secondary?: string;
  /** A few colors of the generated theme (light mode) for the card's gradient. */
  swatches: string[];
  paletteStyleId: string;
  screens: number;
  pages: number;
};

export type DesignsTable = {
  id: Generated<string>;
  user_id: string;
  name: string;
  doc: ColumnType<unknown, string, string>;
  doc_version: number;
  preview: ColumnType<DesignPreview, string, string>;
  size_bytes: number;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, never, Date>;
};

export type Database = {
  "dialmade.designs": DesignsTable;
};
