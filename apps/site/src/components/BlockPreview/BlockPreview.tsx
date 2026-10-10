import type { CSSProperties } from "react";
import type { BlockId } from "@/lib/blocks";
import type { DemoBrand } from "@/lib/brands";
import { cn } from "@/lib/cn";

export type BlockPreviewProps = {
  id: BlockId;
  mode: "wire" | "design";
  /** Visible name of the block (the wireframe shows it like a canvas node). */
  label: string;
  /** Nominal size, shown in mono on wireframes. */
  size?: string;
  /** Narrow (mobile) arrangement. */
  compact?: boolean;
  /**
   * Paints the design mode (its CSS vars must be in scope, or pass it here to set them). Set here, the
   * vars go as OKLCH channels with `brand-transition`, so a brand switch interpolates instead of jumping.
   */
  brand?: DemoBrand;
  className?: string;
};

/**
 * A mini block of the Modo Layout: the named rectangle (wire) or its generated design, painted with
 * a fictitious brand through CSS vars. Decorative: callers give it an accessible name.
 */
export function BlockPreview({ id, mode, label, size, compact = false, brand, className }: BlockPreviewProps) {
  const style = brand ? (brand.channels as CSSProperties) : undefined;
  if (mode === "wire") {
    return (
      <div
        aria-hidden
        style={style}
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[7px] border border-dashed border-white/20 bg-white/[0.025] px-2.5",
          id === "navbar" ? "justify-center" : "py-2",
          brand && "brand-transition",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] leading-3 font-medium text-fg/85">{label}</span>
          {size && !compact ? <span className="font-mono text-[9px] leading-3 text-subtle">{size}</span> : null}
        </div>
        {id === "navbar" ? null : <WireSkeleton id={id} compact={compact} />}
      </div>
    );
  }
  return (
    <div
      aria-hidden
      style={{ ...style, backgroundColor: "var(--page)", color: "var(--page-ink)" }}
      className={cn("relative h-full overflow-hidden rounded-[7px] border border-[var(--page-line)]", brand && "brand-transition", className)}
    >
      <Design id={id} compact={compact} brand={brand} />
    </div>
  );
}

/* ---------- shared bits ---------- */

const ink = "var(--page-ink)";
const muted = "var(--page-muted)";
const line = "var(--page-line)";
const brandColor = "var(--brand)";
const soft = "var(--brand-soft)";

function Bar({ w, h = 4, color = muted, className }: { w: string; h?: number; color?: string; className?: string }) {
  return <span className={cn("block shrink-0 rounded-full", className)} style={{ width: w, height: h, background: color }} />;
}

function Glyph({ shape = "circle", size = 10 }: { shape?: DemoBrand["glyph"]; size?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} className="shrink-0">
      {shape === "circle" ? <circle cx="6" cy="6" r="5" fill={brandColor} /> : null}
      {shape === "leaf" ? <path d="M2 10C2 5 5 2 10 2c0 5-3 8-8 8Z" fill={brandColor} /> : null}
      {shape === "spark" ? <path d="M6 0l1.6 4.4L12 6l-4.4 1.6L6 12 4.4 7.6 0 6l4.4-1.6Z" fill={brandColor} /> : null}
    </svg>
  );
}

function WireSkeleton({ id, compact }: { id: BlockId; compact: boolean }) {
  const cell = "rounded-[3px] bg-white/[0.06]";
  switch (id) {
    case "hero":
      return (
        <div className="mt-2 flex flex-1 flex-col justify-center gap-1.5">
          <span className={cn(cell, "h-2.5 w-[62%]")} />
          <span className={cn(cell, "h-2.5 w-[44%]")} />
          <span className={cn(cell, "mt-1 h-4 w-14")} />
        </div>
      );
    case "calendar":
      return (
        <div className="mt-2 grid flex-1 grid-cols-7 gap-1">
          {Array.from({ length: compact ? 21 : 28 }, (_, i) => (
            <span key={i} className={cell} />
          ))}
        </div>
      );
    case "cards":
    case "pricing":
    case "testimonials":
      return (
        <div className={cn("mt-2 grid flex-1 gap-1.5", compact ? "grid-cols-1" : id === "testimonials" ? "grid-cols-2" : "grid-cols-3")}>
          {Array.from({ length: compact ? 2 : id === "testimonials" ? 2 : 3 }, (_, i) => (
            <span key={i} className={cn(cell, "rounded-[5px]")} />
          ))}
        </div>
      );
    case "footer":
      return (
        <div className="mt-2 flex flex-1 items-end gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn(cell, "h-2 flex-1")} />
          ))}
        </div>
      );
    default:
      return null;
  }
}

/* ---------- generated designs ---------- */

function Design({ id, compact, brand }: { id: BlockId; compact: boolean; brand?: DemoBrand }) {
  switch (id) {
    case "navbar":
      return (
        <div className="flex h-full items-center justify-between gap-2 px-2.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <Glyph shape={brand?.glyph} />
            <span className="truncate text-[9px] leading-none font-semibold tracking-tight whitespace-nowrap" style={{ color: ink }}>
              {brand?.name ?? "Brand"}
            </span>
          </span>
          {compact ? (
            <span className="flex shrink-0 flex-col gap-[3px]">
              <Bar w="12px" h={2} color={ink} />
              <Bar w="12px" h={2} color={ink} />
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-2.5">
              <Bar w="18px" h={3} />
              <Bar w="22px" h={3} />
              <Bar w="16px" h={3} />
              <span className="h-4 w-11 rounded-[4px]" style={{ background: brandColor }} />
            </span>
          )}
        </div>
      );
    case "hero":
      return (
        <div className={cn("grid h-full gap-3 p-3", compact ? "grid-rows-[1fr_auto]" : "grid-cols-[1.15fr_1fr] items-center")}>
          {compact ? <HeroArt /> : null}
          <div className="flex flex-col gap-1.5">
            <Bar w="38px" h={4} color={soft} />
            <Bar w="92%" h={8} color={ink} />
            <Bar w="64%" h={8} color={ink} />
            <Bar w="78%" h={3} className="mt-0.5" />
            <span className="mt-1.5 flex gap-1.5">
              <span className="h-5 w-14 rounded-[5px]" style={{ background: brandColor }} />
              <span className="h-5 w-12 rounded-[5px] border" style={{ borderColor: line }} />
            </span>
          </div>
          {compact ? null : <HeroArt />}
        </div>
      );
    case "calendar":
      return (
        <div className={cn("grid h-full gap-2.5 p-3", compact ? "grid-cols-1" : "grid-cols-[1.6fr_1fr]")}>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between">
              <Bar w="54px" h={5} color={ink} />
              <span className="flex gap-1">
                <span className="size-2.5 rounded-[3px] border" style={{ borderColor: line }} />
                <span className="size-2.5 rounded-[3px] border" style={{ borderColor: line }} />
              </span>
            </span>
            <div className="grid flex-1 grid-cols-7 gap-[3px]">
              {Array.from({ length: 28 }, (_, i) => (
                <span
                  key={i}
                  className="rounded-[3px]"
                  style={{ background: i === 17 ? brandColor : i === 9 || i === 10 || i === 24 ? soft : line, opacity: i === 17 ? 1 : 0.9 }}
                />
              ))}
            </div>
          </div>
          {compact ? null : (
            <div className="flex flex-col gap-1.5">
              <Bar w="40px" h={4} color={ink} />
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="flex h-5 items-center rounded-[5px] border px-1.5"
                  style={i === 1 ? { background: brandColor, borderColor: brandColor } : { borderColor: line }}
                >
                  <Bar w="60%" h={3} color={i === 1 ? "var(--brand-ink)" : muted} />
                </span>
              ))}
            </div>
          )}
        </div>
      );
    case "cards":
      return (
        <div className={cn("grid h-full gap-2 p-3", compact ? "grid-cols-1" : "grid-cols-3")}>
          {Array.from({ length: compact ? 2 : 3 }, (_, i) => (
            <span key={i} className="flex flex-col gap-1.5 overflow-hidden rounded-[6px] border p-1.5" style={{ borderColor: line }}>
              <span className="min-h-6 flex-1 rounded-[4px]" style={{ background: i === 0 ? brandColor : soft, opacity: i === 0 ? 0.85 : 1 }} />
              <Bar w="70%" h={4} color={ink} />
              <Bar w="50%" h={3} />
            </span>
          ))}
        </div>
      );
    case "pricing":
      return (
        <div className={cn("grid h-full gap-2 p-3", compact ? "grid-cols-1" : "grid-cols-3")}>
          {Array.from({ length: compact ? 2 : 3 }, (_, i) => {
            const featured = compact ? i === 0 : i === 1;
            return (
              <span
                key={i}
                className="flex flex-col gap-1.5 rounded-[6px] border p-2"
                style={{ borderColor: featured ? brandColor : line, boxShadow: featured ? `0 0 0 1px ${brandColor}` : undefined }}
              >
                <Bar w="40%" h={3} />
                <Bar w="55%" h={8} color={ink} />
                {compact ? null : (
                  <>
                    <Bar w="80%" h={2.5} />
                    <Bar w="70%" h={2.5} />
                  </>
                )}
                <span
                  className="mt-auto h-4 rounded-[4px] border"
                  style={featured ? { background: brandColor, borderColor: brandColor } : { borderColor: line }}
                />
              </span>
            );
          })}
        </div>
      );
    case "testimonials":
      return (
        <div className={cn("grid h-full gap-2 p-3", compact ? "grid-cols-1" : "grid-cols-2")}>
          {Array.from({ length: 2 }, (_, i) => (
            <span key={i} className="flex flex-col justify-between gap-1.5 rounded-[6px] p-2" style={{ background: soft }}>
              <span className="flex flex-col gap-1">
                <Bar w="90%" h={3} color={ink} />
                <Bar w="70%" h={3} color={ink} />
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-full" style={{ background: brandColor }} />
                <Bar w="34px" h={3} />
              </span>
            </span>
          ))}
        </div>
      );
    case "footer":
      return (
        <div className="flex h-full items-start justify-between gap-3 border-t p-3" style={{ borderColor: line }}>
          <span className="flex items-center gap-1.5">
            <Glyph shape={brand?.glyph} size={9} />
            <Bar w="30px" h={3} color={ink} />
          </span>
          <span className="flex gap-3">
            {Array.from({ length: compact ? 2 : 3 }, (_, i) => (
              <span key={i} className="flex flex-col gap-1">
                <Bar w="22px" h={2.5} color={ink} />
                <Bar w="18px" h={2.5} />
                <Bar w="20px" h={2.5} />
              </span>
            ))}
          </span>
        </div>
      );
  }
}

function HeroArt() {
  return (
    <span className="relative block h-full min-h-10 overflow-hidden rounded-[6px]" style={{ background: soft }}>
      <span className="absolute -right-3 -bottom-4 size-16 rounded-full opacity-80" style={{ background: brandColor }} />
      <span className="absolute top-3 left-3 h-2 w-10 rounded-full" style={{ background: "var(--page)" }} />
    </span>
  );
}
