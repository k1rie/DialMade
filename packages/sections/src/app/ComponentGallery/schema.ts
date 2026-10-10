import { z } from "zod";

export const GALLERY_SCOPES = ["all", "essentials"] as const;

export const componentGallerySchema = z.strictObject({
  brandName: z.string(),
  title: z.string(),
  subtitle: z.string(),
  scope: z.enum(GALLERY_SCOPES),
});

export type ComponentGalleryProps = z.infer<typeof componentGallerySchema>;
