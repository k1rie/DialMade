"use client";

import { Avatar, AvatarGroup, type AvatarSize } from "../../Avatar";
import { GalleryDemo } from "../GalleryDemo";
import { useGalleryCopy } from "../useGalleryCopy";
import { PEOPLE } from "./people";

const SIZES: AvatarSize[] = ["xs", "sm", "md", "lg", "xl"];

export function AvatarsDemo() {
  const t = useGalleryCopy().avatars;
  return (
    <>
      <GalleryDemo label={t.sizes}>
        <div className="dl-gallery-row">
          {SIZES.map((size, index) => (
            <Avatar key={size} name={PEOPLE[index] ?? PEOPLE[0]} size={size} />
          ))}
        </div>
      </GalleryDemo>
      <GalleryDemo label={t.status}>
        <div className="dl-gallery-row">
          <Avatar name={PEOPLE[0]} status="online" size="lg" />
          <Avatar name={PEOPLE[1]} status="away" size="lg" />
          <Avatar name={PEOPLE[2]} status="busy" size="lg" />
          <Avatar name={PEOPLE[3]} status="offline" size="lg" />
        </div>
      </GalleryDemo>
      <GalleryDemo label={t.shapes}>
        <div className="dl-gallery-row">
          <Avatar name={PEOPLE[4]} size="lg" />
          <Avatar name={PEOPLE[5]} size="lg" shape="square" />
          <Avatar name={PEOPLE[6]} size="lg" shape="square" status="online" />
        </div>
      </GalleryDemo>
      <GalleryDemo label={t.group}>
        <AvatarGroup label={t.team} items={PEOPLE.map((name) => ({ name }))} max={4} />
        <AvatarGroup label={t.team} items={PEOPLE.slice(0, 3).map((name) => ({ name }))} size="sm" />
      </GalleryDemo>
    </>
  );
}
