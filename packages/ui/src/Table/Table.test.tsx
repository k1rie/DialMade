import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UiProvider } from "../UiProvider";
import { Table, type TableColumn } from "./Table";

interface Row {
  id: string;
  name: string;
  amount: number;
}

const rows: Row[] = Array.from({ length: 7 }, (_, i) => ({ id: `F-${i + 1}`, name: `Cliente ${i + 1}`, amount: (i + 1) * 10 }));
const columns: TableColumn<Row>[] = [
  { key: "id", header: "Factura", rowHeader: true },
  { key: "name", header: "Cliente" },
  { key: "amount", header: "Importe", align: "end", cell: (row) => `$${row.amount}` },
];

describe("Table", () => {
  it("tiene caption, cabeceras de columna y de fila", () => {
    render(<Table caption="Facturas" columns={columns} rows={rows.slice(0, 2)} />);
    const table = screen.getByRole("table", { name: "Facturas" });
    expect(within(table).getAllByRole("columnheader").map((th) => th.textContent)).toEqual(["Factura", "Cliente", "Importe"]);
    expect(within(table).getByRole("rowheader", { name: "F-1" })).toBeTruthy();
    expect(within(table).getByText("$20").dataset.align).toBe("end");
    expect(screen.getByRole("region", { name: "Facturas" }).tabIndex).toBe(0);
  });

  it("pagina con anterior y siguiente", () => {
    render(
      <UiProvider locale="es">
        <Table caption="Facturas" columns={columns} rows={rows} pageSize={3} />
      </UiProvider>,
    );
    const nav = screen.getByRole("navigation", { name: "Paginación" });
    expect(within(nav).getByText("1–3 de 7")).toBeTruthy();
    const previous = screen.getByRole("button", { name: "Página anterior" }) as HTMLButtonElement;
    const next = screen.getByRole("button", { name: "Página siguiente" }) as HTMLButtonElement;
    expect(previous.disabled).toBe(true);
    fireEvent.click(next);
    fireEvent.click(next);
    expect(within(nav).getByText("7–7 de 7")).toBeTruthy();
    expect(next.disabled).toBe(true);
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("muestra un estado vacío", () => {
    render(<Table caption="Vacía" columns={columns} rows={[]} hideCaption />);
    expect(screen.getByRole("table", { name: "Vacía" })).toBeTruthy();
    expect(screen.getByText("No results")).toBeTruthy();
  });
});
