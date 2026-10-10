import type { LocalizedText } from "@dialmade/catalog";
import { isIconName, type IconName } from "@dialmade/ui";
import { z } from "zod";
import { contentProfileIdOf, contentProfileOf } from "../../content/profiles";
import type { ContentContext } from "../../types";
import { APP_PROFILE_COPY, type AppProfileCopy } from "./profileCopy";

export { APP_PROFILE_COPY, type AppProfileCopy } from "./profileCopy";
export { SHELL_DENSITIES, SHELL_TONES, shellStyleFor, type ShellDensity, type ShellTone } from "./shellStyle";
export { LANGUAGE_OPTIONS, appStrings, type AppStrings } from "./strings";

export const appCopyOf = (ctx: Pick<ContentContext, "productType">): AppProfileCopy => APP_PROFILE_COPY[contentProfileIdOf(ctx.productType)];

export const text = (value: LocalizedText, ctx: Pick<ContentContext, "locale">): string => value[ctx.locale];

/** Period of the profile's chart («month», «week», «day»). */
export const chartPeriodOf = (ctx: Pick<ContentContext, "productType">) => contentProfileOf(ctx.productType).chart.period;

/** `"Acme Cloud"` → `"acmecloud"`, for fictional addresses of the user's own brand. */
export function brandSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return slug || "studio";
}

export const iconSchema = z.custom<IconName>((value) => typeof value === "string" && isIconName(value));

export const toneSchema = z.enum(["success", "warning", "info", "destructive", "neutral"]);
