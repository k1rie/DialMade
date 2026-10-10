export type WarningCountProps = { n: number };

/** Small amber count next to a tab label. */
export function WarningCount({ n }: WarningCountProps) {
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warning/15 px-1 text-[10px] leading-none font-semibold text-warning tabular-nums">
      {n}
    </span>
  );
}
