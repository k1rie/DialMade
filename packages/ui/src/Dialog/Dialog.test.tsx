import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";
import { DialogPreview } from "./DialogPreview";

describe("DialogPreview", () => {
  it("es un diálogo no modal con título y descripción", () => {
    render(<DialogPreview title="¿Eliminar?" description="No se puede deshacer." footer={<button type="button">Eliminar</button>} />);
    const dialog = screen.getByRole("dialog", { name: "¿Eliminar?" });
    expect(dialog.getAttribute("aria-modal")).toBe("false");
    expect(document.getElementById(dialog.getAttribute("aria-describedby") ?? "")?.textContent).toBe("No se puede deshacer.");
    expect(screen.getByRole("heading", { level: 2, name: "¿Eliminar?" })).toBeTruthy();
  });

  it("solo muestra el botón de cerrar con onClose", () => {
    const onClose = vi.fn();
    render(<DialogPreview title="Aviso" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});

function Controlled({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <Dialog open={open} onOpenChange={setOpen} title="Invitar" description="Por email" dismissible={dismissible}>
        <input aria-label="Email" />
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("se abre y se cierra con el botón de cerrar", () => {
    render(<Controlled />);
    const dialog = document.querySelector("dialog");
    expect(dialog?.open).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect(dialog?.open).toBe(true);
    expect(dialog?.getAttribute("aria-labelledby")).toBe(screen.getByRole("heading", { name: "Invitar", hidden: true }).id);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(dialog?.open).toBe(false);
  });

  it("Esc (evento cancel) cierra si es descartable", () => {
    render(<Controlled />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(dialog.open).toBe(false);
  });

  it("no se descarta si dismissible es false", () => {
    render(<Controlled dismissible={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    fireEvent.click(dialog);
    expect(dialog.open).toBe(true);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });
});
