import { FRAME_BAR_PX } from "../constants";

export type FrameBarProps = {
  /** «Escritorio · 1440 px». */
  size: string;
  /** «Rejilla de 12 columnas». */
  grid: string;
};

/** The thin browser-like bar on top of the device frame (same look as the Composer's): device, width and grid. */
export function FrameBar({ size, grid }: FrameBarProps) {
  return (
    <div
      aria-hidden
      className="flex items-center gap-1.5 rounded-t-[12px] border border-b-0 border-app-strong bg-app-elevated px-3"
      style={{ height: FRAME_BAR_PX }}
    >
      <span className="size-2 rounded-full bg-white/15" />
      <span className="size-2 rounded-full bg-white/15" />
      <span className="size-2 rounded-full bg-white/15" />
      <span className="ms-auto truncate font-mono text-[11px] text-subtle tabular-nums">
        {size} · {grid}
      </span>
    </div>
  );
}
