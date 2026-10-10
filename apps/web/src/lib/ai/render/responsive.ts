// Gate 5 (spec §7) on the app side: the widths an AI block's island measures at, and the verdict from its answers.
// Each width is the block's CELL on that device (the layout's rect in that breakpoint's columns × the device frame of
// `DEVICE_WIDTHS`), so the block's container queries see what they will see on a phone, a tablet and a desktop. The
// island measures them all in one task (apps/preview/src/measure.ts); `responsiveGate` words nothing, it returns codes.
import { MAX_MEASURE_WIDTH, MIN_MEASURE_WIDTH } from "@dialmade/ai-render/protocol";
import { DEVICES, responsiveGate, type Device, type DeviceMeasure } from "@dialmade/ai-render";
import type { AiGateWarning, Screen } from "@dialmade/doc";
import { DEVICE_COLUMNS, DEVICE_WIDTHS } from "@/lib/devices";
import { compileScreenLayout } from "@/lib/screen-layout";

export type CellWidths = Partial<Record<Device, number>>;

const clampWidth = (width: number) => Math.max(MIN_MEASURE_WIDTH, Math.min(MAX_MEASURE_WIDTH, Math.round(width)));

/**
 * Width of `blockId`'s cell on each device: its rect's share of the grid's columns times the device frame. A block
 * hidden on a device has no width there; an absorbed block (drawn by its host) takes its host's cell.
 */
export function cellWidths(screen: Pick<Screen, "layout" | "kind">, blockId: string): CellWidths {
  const compiled = compileScreenLayout(screen);
  const id = compiled.absorbed[blockId] ?? blockId;
  const out: CellWidths = {};
  const desktop = compiled.layout.blocks[id];
  if (desktop && !desktop.hidden) out.desktop = clampWidth((DEVICE_WIDTHS.desktop * desktop.rect.w) / DEVICE_COLUMNS.desktop);
  for (const device of ["tablet", "mobile"] as const) {
    const derived = compiled.responsive[device].blocks[id];
    if (derived?.rect && !derived.hidden) out[device] = clampWidth((DEVICE_WIDTHS[device] * derived.rect.w) / DEVICE_COLUMNS[device]);
  }
  if (!desktop) for (const device of DEVICES) out[device] ??= clampWidth(DEVICE_WIDTHS[device]);
  return out;
}

/** The distinct widths to send in the island's `measure` message, widest first. */
export const measureWidths = (widths: CellWidths): number[] =>
  [...new Set(DEVICES.flatMap((device) => (widths[device] === undefined ? [] : [widths[device]!])))].sort((a, b) => b - a);

export type ResponsiveVerdict = { responsive: "ok" | "warn"; warnings: AiGateWarning[] };

/**
 * Collects the island's `measure` answers for one round (one per width) and returns gate 5's verdict once every
 * device has one; `null` until then. Answers at other widths (the island's own width after a render) are ignored.
 */
export class ResponsiveCollector {
  private readonly measures = new Map<Device, DeviceMeasure>();

  constructor(
    private readonly widths: CellWidths,
    private readonly layoutHeightPx?: number,
  ) {}

  add(measure: { width: number; overflowX: boolean; smallTargets: number; clipped: number; height?: number }): ResponsiveVerdict | null {
    const devices = DEVICES.filter((device) => this.widths[device] === measure.width);
    if (devices.length === 0) return null;
    for (const device of devices) this.measures.set(device, { ...measure, device });
    const expected = DEVICES.filter((device) => this.widths[device] !== undefined);
    if (expected.some((device) => !this.measures.has(device))) return null;
    const verdict = responsiveGate([...this.measures.values()], this.layoutHeightPx ? { layoutHeightPx: this.layoutHeightPx } : {});
    this.measures.clear();
    return verdict;
  }
}
