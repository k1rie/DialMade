import type { ProductGroupId, ProductType } from "@dialmade/catalog";
import type { ContentProfile, ContentProfileId } from "../types";
import { analytics } from "./analytics";
import { commerce } from "./commerce";
import { community } from "./community";
import { consumer } from "./consumer";
import { creative } from "./creative";
import { devtools } from "./devtools";
import { education } from "./education";
import { finance } from "./finance";
import { health } from "./health";
import { media } from "./media";
import { publicSector } from "./public";
import { saas } from "./saas";
import { services } from "./services";

export const CONTENT_PROFILES: Readonly<Record<ContentProfileId, ContentProfile>> = {
  saas,
  analytics,
  devtools,
  commerce,
  finance,
  health,
  education,
  media,
  creative,
  community,
  services,
  consumer,
  public: publicSector,
};

/** Each of the 17 product groups of the catalog speaks with one of the 13 content profiles. */
export const GROUP_PROFILES: Readonly<Record<ProductGroupId, ContentProfileId>> = {
  software: "saas",
  data: "analytics",
  industry: "analytics",
  developer: "devtools",
  commerce: "commerce",
  finance: "finance",
  health: "health",
  education: "education",
  media: "media",
  creative: "creative",
  community: "community",
  events: "community",
  services: "services",
  travel: "services",
  personal: "consumer",
  games: "consumer",
  public: "public",
};

export function contentProfileIdOf(productType: Pick<ProductType, "group">): ContentProfileId {
  return GROUP_PROFILES[productType.group as ProductGroupId] ?? "saas";
}

export const contentProfileOf = (productType: Pick<ProductType, "group">): ContentProfile =>
  CONTENT_PROFILES[contentProfileIdOf(productType)];
