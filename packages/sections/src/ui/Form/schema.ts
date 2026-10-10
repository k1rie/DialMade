import { z } from "zod";
import { sectionLevelSchema } from "../lib/heading";
import { FIELD_IDS, FIELD_KINDS, FORM_PURPOSES } from "../content";
import { UI_FRAMES } from "../lib/fit";

export const formFieldSchema = z.strictObject({
  /** One of the pool ids (`name`, `email`…): the purpose picks fields by id. */
  id: z.string().min(1),
  label: z.string(),
  kind: z.enum(FIELD_KINDS),
  placeholder: z.string(),
  required: z.boolean(),
  options: z.array(z.string()).max(12).optional(),
});

export type FormField = z.infer<typeof formFieldSchema>;

export const formSchema = z.strictObject({
  /**
   * Texts that depend on the purpose. Absent: the purpose's own text («Iniciar sesión»), so a purpose
   * chosen by the note or the size never shows texts written for another one. An empty string hides it.
   */
  title: z.string().optional(),
  description: z.string().optional(),
  submit: z.string().optional(),
  secondary: z.string().optional(),
  purpose: z.enum(FORM_PURPOSES),
  /** The field pool, in pool order: every purpose reads it, so switching never loses an edited label. */
  fields: z.array(formFieldSchema).min(1).max(FIELD_IDS.length + 1),
  /** Fields shown, in the purpose's order. */
  count: z.number().int().min(1).max(FIELD_IDS.length + 1),
  frame: z.enum(UI_FRAMES),
  /** Heading level of the title (`sectionLevelSchema`): absent is h2. */
  level: sectionLevelSchema,
});

export type FormProps = z.infer<typeof formSchema>;
