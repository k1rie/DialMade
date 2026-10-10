import { Avatar, Badge, Progress } from "@dialmade/ui";
import type { DataTableCellData, DataTableColumn } from "../schema";

export interface DataTableCellProps {
  column: DataTableColumn;
  cell: DataTableCellData | undefined;
  /** Accessible name of the row (its first cell), for progress bars. */
  rowName: string;
}

/** One cell, drawn by the kind of its column: status badges, people with avatars, progress, ids… */
export function DataTableCell({ column, cell, rowName }: DataTableCellProps) {
  if (!cell) return <span className="dl-app-table__muted">—</span>;
  switch (column.kind) {
    case "status":
      return (
        <Badge variant={cell.tone ?? "neutral"} dot>
          {cell.text}
        </Badge>
      );
    case "person":
    case "company":
      return (
        <span className="dl-app-table__entity">
          <span aria-hidden="true" className="dl-app-table__avatar">
            <Avatar name={cell.text} size="xs" shape={column.kind === "company" ? "square" : "circle"} />
          </span>
          <span className="dl-app-table__entity-name">{cell.text}</span>
        </span>
      );
    case "id":
      return <span className="dl-app-table__mono">{cell.text}</span>;
    case "percent":
      return cell.value !== undefined && column.key === "progress" ? (
        <span className="dl-app-table__progress">
          <Progress value={cell.value} size="sm" aria-label={`${column.label}: ${rowName}`} />
          <span>{cell.text}</span>
        </span>
      ) : (
        cell.text
      );
    case "date":
    case "relative":
    case "time":
      return <span className="dl-app-table__muted">{cell.text}</span>;
    default:
      return cell.text;
  }
}
