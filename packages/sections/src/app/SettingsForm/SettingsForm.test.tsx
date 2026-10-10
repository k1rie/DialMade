import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { settingsFormSection } from "./definition";

describe("app.settingsForm", () => {
  it("campos con etiqueta, valores de la marca y switches", () => {
    renderSection(settingsFormSection);
    expect(screen.getByRole("heading", { level: 2, name: "Ajustes del espacio" })).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "Nombre del espacio" }) as HTMLInputElement).value).toBe("Acme Cloud");
    expect((screen.getByRole("textbox", { name: "Correo de contacto" }) as HTMLInputElement).value).toBe("hola@acmecloud.com");
    expect((screen.getByRole("textbox", { name: "Descripción" }) as HTMLTextAreaElement).value).toBe("Ship faster, sleep better");
    expect((screen.getByRole("combobox", { name: "Idioma" }) as HTMLSelectElement).value).toBe("es");
    const switches = screen.getAllByRole("switch") as HTMLInputElement[];
    expect(switches.map((input) => input.checked)).toEqual([true, true, false]);
    expect(screen.getByRole("group", { name: "Notificaciones" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar cambios" }).getAttribute("type")).toBe("submit");
  });

  it("enviar no navega", () => {
    renderSection(settingsFormSection, { locale: "en" });
    const form = screen.getByRole("form", { name: "Workspace settings" });
    const event = new Event("submit", { bubbles: true, cancelable: true });
    fireEvent(form, event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("una zona horaria editada que no está en la lista se añade", () => {
    renderSection(settingsFormSection, { props: { timezone: "Lima (GMT−5)" }, variant: "split" });
    const select = screen.getByRole("combobox", { name: "Zona horaria" }) as HTMLSelectElement;
    expect(select.value).toBe("Lima (GMT−5)");
  });
});
