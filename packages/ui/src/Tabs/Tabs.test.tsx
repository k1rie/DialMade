import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

const items = [
  { value: "a", label: "Resumen", content: "Panel A" },
  { value: "b", label: "Actividad", content: "Panel B" },
  { value: "c", label: "Archivado", content: "Panel C", disabled: true },
  { value: "d", label: "Ajustes", content: "Panel D" },
];

describe("Tabs", () => {
  it("expone tablist, tabs y el panel activo", () => {
    render(<Tabs label="Secciones" items={items} />);
    expect(screen.getByRole("tablist", { name: "Secciones" })).toBeTruthy();
    const first = screen.getByRole("tab", { name: "Resumen" });
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(first.tabIndex).toBe(0);
    expect(screen.getByRole("tab", { name: "Actividad" }).tabIndex).toBe(-1);
    const panel = screen.getByRole("tabpanel", { name: "Resumen" });
    expect(panel.textContent).toBe("Panel A");
    expect(first.getAttribute("aria-controls")).toBe(panel.id);
  });

  it("las flechas, Home y End mueven la selección y saltan las desactivadas", () => {
    const onValueChange = vi.fn();
    render(<Tabs label="Secciones" items={items} onValueChange={onValueChange} />);
    const list = screen.getByRole("tablist");
    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Actividad" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Ajustes" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Ajustes" }));
    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Resumen" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(list, { key: "End" });
    expect(onValueChange).toHaveBeenLastCalledWith("d");
    fireEvent.keyDown(list, { key: "Home" });
    expect(onValueChange).toHaveBeenLastCalledWith("a");
  });

  it("selecciona con clic y respeta el modo controlado", () => {
    const onValueChange = vi.fn();
    render(<Tabs label="Periodo" variant="segmented" items={items} value="a" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Actividad" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("tab", { name: "Resumen" }).getAttribute("aria-selected")).toBe("true");
  });
});
