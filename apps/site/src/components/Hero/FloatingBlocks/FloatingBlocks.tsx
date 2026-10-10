import type { CSSProperties } from "react";
import { BlockPreview } from "@/components/BlockPreview";
import { NamedCursor } from "@/components/NamedCursor";
import { landing, type Locale } from "@/i18n";
import { blocks } from "@/lib/blocks";
import { demoBrands } from "@/lib/brands";
import { floatingTiles } from "./constants";

/**
 * Decorative canvas nodes around the hero, ≥1280 px. One staggered CSS entrance (≤900 ms in total), no
 * loops and no JS: a server component, so it costs nothing on phones where it is hidden. The layer is
 * capped at 1440 px and centered, so on wide screens the nodes stay around the copy, not on the edges.
 */
export function FloatingBlocks({ locale }: { locale: Locale }) {
  const t = landing[locale];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-full max-w-[1440px] -translate-x-1/2 xl:block">
      {floatingTiles.map((tile, i) => {
        const brand = demoBrands.find((b) => b.id === tile.brand);
        const spec = blocks[tile.id];
        return (
          <div
            key={tile.id}
            className="absolute tile-in"
            style={{ ...tile.position, width: tile.width, rotate: `${tile.rotate}deg`, "--tile-delay": `${0.12 + i * 0.05}s` } as CSSProperties}
          >
            {/* Wireframes carry their own name and size; generated designs get a node header (FLORA). */}
            {brand ? (
              <div className="mb-1.5 flex items-center justify-between px-0.5 font-mono text-[10px] leading-3">
                <span className="text-fg/80">{t.blocks[tile.id]}</span>
                <span className="text-subtle">{brand.name}</span>
              </div>
            ) : null}
            <div
              className="rounded-[10px] border border-app bg-app-elevated/80 p-1.5 shadow-surface"
              style={{ height: Math.round(spec.height.desktop * 1.15) + 12 }}
            >
              <BlockPreview id={tile.id} mode={tile.mode} label={t.blocks[tile.id]} size={spec.size} brand={brand} />
            </div>
            {tile.cursor ? <NamedCursor label={t.demo.cursor} className="absolute -right-6 -bottom-5" /> : null}
          </div>
        );
      })}
    </div>
  );
}
