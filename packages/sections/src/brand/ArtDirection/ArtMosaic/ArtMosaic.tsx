import { BrandMark } from "../../BrandMark";
import type { ArtCopy } from "../copy";
import "./ArtMosaic.css";

export interface ArtMosaicProps {
  copy: ArtCopy;
  brandName: string;
  /** Compact strip (Guidelines variant) instead of the mosaic. */
  compact?: boolean;
}

const TILES = ["key", "glow", "mesh", "dots", "grid"] as const;

/** Gradients and textures derived from the brand scales, as a mosaic of captioned tiles. */
export function ArtMosaic({ copy, brandName, compact }: ArtMosaicProps) {
  return (
    <ul className="dl-brand-art-mosaic" data-compact={compact ? "" : undefined} aria-label={copy.mosaic}>
      {TILES.map((tile) => (
        <li key={tile} className="dl-brand-art-mosaic__tile" data-tile={tile}>
          {tile === "key" && (
            <span className="dl-brand-art-mosaic__mark">
              <BrandMark name={brandName} surface="brand" layout="symbol" decorative />
            </span>
          )}
          <span className="dl-brand-art-mosaic__caption">
            <span>{copy.tiles[tile].name}</span>
            <code>{copy.tiles[tile].recipe}</code>
          </span>
        </li>
      ))}
    </ul>
  );
}
