import { z } from "zod";
import { LANGUAGE_OPTIONS } from "../content";
import { SETTINGS_MAX_COUNT } from "./fields";

export const LANGUAGE_IDS = LANGUAGE_OPTIONS.map((option) => option.value) as [
  (typeof LANGUAGE_OPTIONS)[number]["value"],
  ...(typeof LANGUAGE_OPTIONS)[number]["value"][],
];

export const settingsToggleSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
  description: z.string(),
  enabled: z.boolean(),
});

export const settingsFormSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  workspaceName: z.string(),
  email: z.string(),
  about: z.string(),
  language: z.enum(LANGUAGE_IDS),
  timezone: z.string(),
  notifications: z.array(settingsToggleSchema).max(6),
  /**
   * Fields shown, in order: name, email, language, time zone, about, then the switches. Layout pages fit it
   * to the chip (2–8); the default shows the whole form.
   */
  count: z.number().int().min(1).max(SETTINGS_MAX_COUNT),
});

export type SettingsFormProps = z.infer<typeof settingsFormSchema>;
