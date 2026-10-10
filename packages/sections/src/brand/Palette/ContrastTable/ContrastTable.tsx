import type { CSSProperties } from "react";
import { Badge, Table, type TableColumn } from "@dialmade/ui";
import type { RenderContext } from "../../../types";
import { contrastRows, type ContrastRow } from "../../lib/contrast";
import { formatRatio } from "../../lib/format";
import type { BrandSystem } from "../../lib/system";
import { KEY_PAIRS, ROLE_NAMES } from "../constants";
import { PALETTE_COPY } from "../copy";
import "./ContrastTable.css";

export interface ContrastTableProps {
  ctx: RenderContext;
  system: BrandSystem;
}

const order = new Map<string, number>(KEY_PAIRS.map((pair, index) => [pair, index]));

/** The key text and UI pairs of the current mode, with their WCAG ratio and AA verdict. */
export function ContrastTable({ ctx, system }: ContrastTableProps) {
  const copy = PALETTE_COPY[ctx.locale];
  const { locale } = ctx;
  const rows = contrastRows(system, ctx.mode)
    .filter((row) => order.has(row.pair))
    .sort((a, b) => order.get(a.pair)! - order.get(b.pair)!);
  const roleName = (role: string) => ROLE_NAMES[role]?.[locale] ?? role;

  const columns: TableColumn<ContrastRow>[] = [
    {
      key: "sample",
      header: copy.sample,
      cell: (row) => (
        <span
          className="dl-brand-contrast__sample"
          aria-hidden="true"
          style={{ "--_contrast-fg": row.fg, "--_contrast-bg": row.bg } as CSSProperties}
        >
          Aa
        </span>
      ),
    },
    {
      key: "pair",
      header: copy.pair,
      rowHeader: true,
      cell: (row) => (
        <span className="dl-brand-contrast__pair">
          {roleName(row.fgRole)} <span>{copy.on}</span> {roleName(row.bgRole)}
        </span>
      ),
    },
    { key: "ratio", header: copy.ratio, align: "end", cell: (row) => formatRatio(row.ratio, locale) },
    { key: "required", header: copy.required, align: "end", cell: (row) => formatRatio(row.required, locale) },
    {
      key: "result",
      header: copy.result,
      cell: (row) => (
        <Badge variant={row.pass ? "success" : "destructive"} icon={row.pass ? "check" : "x"} size="sm">
          {row.pass ? copy.pass : copy.fail}
        </Badge>
      ),
    },
  ];

  return (
    <Table
      className="dl-brand-contrast"
      caption={copy.contrast(copy[ctx.mode])}
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.pair}
      density="compact"
    />
  );
}
