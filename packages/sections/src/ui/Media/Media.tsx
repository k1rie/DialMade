"use client";

import type { CSSProperties } from "react";
import type { SectionComponentProps } from "../../types";
import { UiBlock } from "../UiBlock";
import type { MediaProps } from "./schema";
import "./Media.css";

/** CSS-only artwork from the brand colors (no image files): a gradient, a browser window or a phone. */
export function Media({ ratio, caption, alt, frame, variant }: SectionComponentProps<MediaProps>) {
  const style = { "--_ui-ratio": ratio.replace(":", " / ") } as CSSProperties;
  const named = alt.trim().length > 0;
  return (
    <UiBlock className="dl-ui-media" variant={variant} frame={frame} as="div">
      <figure className="dl-ui-media__figure">
        <div
          className="dl-ui-media__art"
          style={style}
          {...(named ? { role: "img", "aria-label": alt } : { "aria-hidden": true })}
          data-dl-prop="alt"
        >
          {variant === "browser" ? (
            <span className="dl-ui-media__window">
              <span className="dl-ui-media__toolbar">
                <span className="dl-ui-media__dot" />
                <span className="dl-ui-media__dot" />
                <span className="dl-ui-media__dot" />
                <span className="dl-ui-media__address" />
              </span>
              <span className="dl-ui-media__screen">
                <span className="dl-ui-media__line" />
                <span className="dl-ui-media__line" />
                <span className="dl-ui-media__tiles">
                  <span className="dl-ui-media__tile" />
                  <span className="dl-ui-media__tile" />
                  <span className="dl-ui-media__tile" />
                </span>
              </span>
            </span>
          ) : variant === "device" ? (
            <span className="dl-ui-media__device">
              <span className="dl-ui-media__notch" />
              <span className="dl-ui-media__screen">
                <span className="dl-ui-media__line" />
                <span className="dl-ui-media__line" />
                <span className="dl-ui-media__tile" />
                <span className="dl-ui-media__tile" />
              </span>
            </span>
          ) : (
            <>
              <span className="dl-ui-media__shape" />
              <span className="dl-ui-media__shape" />
              <span className="dl-ui-media__shape" />
            </>
          )}
        </div>
        {caption ? (
          <figcaption className="dl-ui-media__caption" data-dl-prop="caption">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    </UiBlock>
  );
}
