import type { CSSProperties } from "react";
import { BlockPreview } from "@/components/BlockPreview";
import { NamedCursor } from "@/components/NamedCursor";
import { landing, type Locale } from "@/i18n";
import { blocks, type BlockId } from "@/lib/blocks";
import { demoBrands, type DemoBrand } from "@/lib/brands";
import { cn } from "@/lib/cn";

type StripTile = { id: BlockId; mode: "wire" | "design"; brand?: DemoBrand["id"]; className: string; cursor?: boolean };

/** Below 1280 px the floating nodes don't fit around the copy, so a few of them sit under it instead. */
const tiles: StripTile[] = [
  { id: "navbar", mode: "wire", className: "w-[148px] -rotate-2 sm:w-[180px]" },
  { id: "calendar", mode: "design", brand: "coral", className: "w-[172px] rotate-1 sm:w-[200px]", cursor: true },
  { id: "hero", mode: "design", brand: "bosque", className: "hidden w-[220px] rotate-2 sm:block" },
];

/** The hero canvas nodes for phones, tablets and small laptops (FLORA). Decorative, static after a one-off entrance. */
export function CanvasStrip({ locale }: { locale: Locale }) {
  const t = landing[locale];
  return (
    <div aria-hidden className="pointer-events-none mt-12 flex items-center justify-center gap-3 xl:hidden">
      {tiles.map((tile, i) => {
        const brand = demoBrands.find((b) => b.id === tile.brand);
        const spec = blocks[tile.id];
        return (
          <div key={tile.id} className={cn("relative shrink-0 text-left tile-in", tile.className)} style={{ "--tile-delay": `${0.12 + i * 0.05}s` } as CSSProperties}>
            {brand ? (
              <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5 font-mono text-[10px] leading-3">
                <span className="truncate text-fg/80">{t.blocks[tile.id]}</span>
                <span className="truncate text-subtle">{brand.name}</span>
              </div>
            ) : null}
            <div className="rounded-[10px] border border-app bg-app-elevated/80 p-1.5 shadow-surface" style={{ height: spec.height.desktop + 12 }}>
              <BlockPreview id={tile.id} mode={tile.mode} label={t.blocks[tile.id]} size={spec.size} brand={brand} />
            </div>
            {tile.cursor ? <NamedCursor label={t.demo.cursor} className="absolute -right-4 -bottom-5" /> : null}
          </div>
        );
      })}
    </div>
  );
}
