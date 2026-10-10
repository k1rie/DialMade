import type { CSSProperties } from "react";
import { Table, type TableColumn } from "@dialmade/ui";
import type { ColorMode, RenderContext } from "../../../types";
import { roleCssName } from "../../lib/contrast";
import { formatHex } from "../../lib/format";
import type { BrandSystem } from "../../lib/system";
import { CHART_ROLES, ROLE_NAMES, TABLE_ROLES } from "../constants";
import { PALETTE_COPY } from "../copy";
import "./RolesTable.css";

export interface RolesTableProps {
  ctx: RenderContext;
  system: BrandSystem;
}

interface RoleRow {
  id: string;
  name: string;
  cssVar: string;
  light: string[];
  dark: string[];
}

function Swatches({ hexes }: { hexes: readonly string[] }) {
  return (
    <span className="dl-brand-roles__value">
      <span className="dl-brand-roles__swatches" aria-hidden="true">
        {hexes.map((hex, index) => (
          <span key={index} className="dl-brand-roles__swatch" style={{ "--_roles-swatch": hex } as CSSProperties} />
        ))}
      </span>
      {hexes.length === 1 && <code>{formatHex(hexes[0])}</code>}
    </span>
  );
}

/** Every main role with its value in light and dark. */
export function RolesTable({ ctx, system }: RolesTableProps) {
  const copy = PALETTE_COPY[ctx.locale];
  const valuesOf = (roles: readonly string[], mode: ColorMode) =>
    roles.map((role) => system.tokens[mode].colors[roleCssName(role)] ?? "").filter(Boolean);

  const rows: RoleRow[] = TABLE_ROLES.map((role) => {
    if (role === "charts") {
      return {
        id: role,
        name: copy.charts,
        cssVar: "--chart-1…5",
        light: valuesOf(CHART_ROLES, "light"),
        dark: valuesOf(CHART_ROLES, "dark"),
      };
    }
    return {
      id: role,
      name: ROLE_NAMES[role]![ctx.locale],
      cssVar: `--${roleCssName(role)}`,
      light: valuesOf([role], "light"),
      dark: valuesOf([role], "dark"),
    };
  });

  const columns: TableColumn<RoleRow>[] = [
    {
      key: "role",
      header: copy.role,
      rowHeader: true,
      cell: (row) => (
        <span className="dl-brand-roles__role">
          <span>{row.name}</span>
          <code>{row.cssVar}</code>
        </span>
      ),
    },
    { key: "light", header: copy.light, cell: (row) => <Swatches hexes={row.light} /> },
    { key: "dark", header: copy.dark, cell: (row) => <Swatches hexes={row.dark} /> },
  ];

  return <Table className="dl-brand-roles" caption={copy.roles} columns={columns} rows={rows} getRowKey={(row) => row.id} density="compact" />;
}
