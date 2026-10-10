import type { DemoStrings } from "@/i18n";
import { demoBrands, type DemoBrand } from "@/lib/brands";
import { cn } from "@/lib/cn";
import { LayoutIcon, ResetIcon, SparkIcon } from "../icons";

export type DemoToolbarProps = {
  t: DemoStrings;
  brandId: DemoBrand["id"];
  generated: boolean;
  canGenerate: boolean;
  onBrand: (id: DemoBrand["id"]) => void;
  onToggleGenerate: () => void;
  onReset: () => void;
};

/** Floating bottom bar of the canvas (Replit 11B): brand, Generate and reset. */
export function DemoToolbar({ t, brandId, generated, canGenerate, onBrand, onToggleGenerate, onReset }: DemoToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-control border border-app-strong p-1.5 shadow-lift glass">
      <fieldset className="flex items-center gap-1 px-1.5">
        <legend className="sr-only">{t.brand}</legend>
        {/* Visible twin of the legend (hidden from AT so it isn't read twice). */}
        <span aria-hidden className="mr-1 hidden font-mono text-caption text-muted sm:inline">
          {t.brand}
        </span>
        {demoBrands.map((b) => (
          <label
            key={b.id}
            title={b.name}
            className={cn(
              "relative grid size-6 cursor-pointer place-items-center rounded-full transition-transform duration-150 hover:scale-110",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--app-accent)]",
            )}
          >
            <input
              type="radio"
              name="demo-brand"
              value={b.id}
              checked={brandId === b.id}
              onChange={() => onBrand(b.id)}
              aria-label={b.name}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn("size-4 rounded-full ring-offset-2 ring-offset-[var(--app-bg-elevated)]", brandId === b.id && "ring-2 ring-white/80")}
              style={{ background: b.vars["--brand"] }}
            />
          </label>
        ))}
      </fieldset>
      <span aria-hidden className="h-5 w-px bg-white/10" />
      <button
        type="button"
        onClick={onToggleGenerate}
        disabled={!canGenerate}
        className={cn(
          // Not a toggle: the name says the action (Generar / Ver layout) and the live region says the state.
          "inline-flex h-8 items-center gap-1.5 rounded-chip px-3 text-small font-medium transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:opacity-40",
          generated ? "bg-white/10 text-fg hover:bg-white/15" : "bg-accent-cta text-white glow-purple hover:bg-[var(--app-accent-cta-hover)]",
        )}
      >
        {generated ? <LayoutIcon className="size-3.5" /> : <SparkIcon className="size-3.5" />}
        {generated ? t.showLayout : t.generate}
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label={t.reset}
        title={t.reset}
        className="grid size-8 place-items-center rounded-chip text-subtle transition-colors duration-150 hover:bg-white/10 hover:text-fg"
      >
        <ResetIcon />
      </button>
    </div>
  );
}
