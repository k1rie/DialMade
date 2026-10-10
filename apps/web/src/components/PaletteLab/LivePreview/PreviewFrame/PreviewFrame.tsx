import type { OutputKind } from "@dialmade/catalog";
import type { ReactNode } from "react";
import { brandSlug } from "../../format";

export type PreviewFrameProps = {
  kind: OutputKind;
  brandName: string;
  children: ReactNode;
};

const addressFor = (kind: OutputKind, slug: string) =>
  kind === "app" ? `app.${slug}.com` : kind === "brand" ? `${slug}.com/brand` : `${slug}.com`;

/** App-chrome browser window around the user's mini: three dots and the address it would live at. */
export function PreviewFrame({ kind, brandName, children }: PreviewFrameProps) {
  return (
    <div className="relative mx-auto w-full max-w-[44rem] overflow-hidden rounded-[12px] border border-white/10 bg-app-elevated shadow-lift">
      <div aria-hidden className="relative flex h-7 items-center gap-1.5 border-b border-white/[0.06] px-3">
        <span className="size-2 rounded-full bg-white/15" />
        <span className="size-2 rounded-full bg-white/15" />
        <span className="size-2 rounded-full bg-white/15" />
        <span className="absolute left-1/2 max-w-[60%] -translate-x-1/2 truncate rounded-[6px] bg-white/[0.05] px-2.5 py-0.5 font-mono text-[11px] leading-4 text-muted">
          {addressFor(kind, brandSlug(brandName))}
        </span>
      </div>
      {children}
    </div>
  );
}
