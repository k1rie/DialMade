import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { emptyLayout, estimateContent, parseNote, type LayoutBlock } from "@dialmade/layout";
import { visibleProps } from "../../visibleProps";
import { renderSection } from "../../testing/renderSection";
import { settingsFormSection } from "./definition";
import { SETTINGS_DEFAULT_COUNT, settingsFieldsFor, settingsShown, visibleSettings } from "./fields";

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

  it("count shows the first fields, then the switches (the default shows the whole form)", () => {
    renderSection(settingsFormSection, { props: { count: 3 } });
    expect(screen.getByRole("textbox", { name: "Nombre del espacio" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Correo de contacto" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Idioma" })).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Zona horaria" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Descripción" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Notificaciones" })).toBeNull();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
  });

  it("past the five fields, each step adds a switch", () => {
    renderSection(settingsFormSection, { props: { count: 6 } });
    expect(screen.getByRole("textbox", { name: "Descripción" })).toBeTruthy();
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(SETTINGS_DEFAULT_COUNT).toBe(8);
    expect(settingsShown(8, 3)).toEqual({ fields: ["workspaceName", "email", "language", "timezone", "about"], toggles: 3 });
    expect(settingsShown(2, 3)).toEqual({ fields: ["workspaceName", "email"], toggles: 0 });
    expect(settingsShown(11, 6).toggles).toBe(6);
    expect(settingsShown(0, 3).fields).toEqual(["workspaceName"]);
  });

  it("the visible hook describes what renders: fields past count and extra switches are left out", () => {
    const stored = {
      title: "Ajustes",
      description: "",
      workspaceName: { bind: "brand.name" },
      email: "hola@acme.com",
      about: { bind: "brand.tagline" },
      language: "es",
      timezone: "Madrid (GMT+2)",
      notifications: [
        { id: "a", label: "A", description: "", enabled: true },
        { id: "b", label: "B", description: "", enabled: false },
      ],
      count: 4,
    };
    const visible = visibleSettings(stored);
    expect(Object.keys(visible)).not.toContain("about");
    expect(visible.timezone).toBe("Madrid (GMT+2)");
    expect(visible.notifications).toEqual([]);
    expect(visibleSettings({ ...stored, count: 6 }).notifications).toEqual([stored.notifications[0]]);
    expect(visibleProps({ type: "app.settingsForm", props: stored })).toEqual(visible);
    const broken = { ...stored, count: Number.NaN };
    expect(visibleSettings(broken)).toEqual(broken);
  });

  it("fit maps the chip's field count (2–8) to count, and owns it", () => {
    for (const h of [10, 30, 50, 60, 80, 120]) {
      const block: LayoutBlock = { type: "settings", label: "Ajustes", rect: { col: 0, row: 0, w: 8, h }, z: 1 };
      const estimate = estimateContent(block, { ...emptyLayout(), blocks: { b: block } }, "b");
      const input = { w: 8, h, widthPx: 960, heightPx: h * 8, note: parseNote(undefined), estimate, absorbed: [], kind: "app" as const, blockId: "b" };
      const fit = settingsFormSection.layout!.fit(input);
      expect(estimate).toMatchObject({ kind: "count", unit: "fields" });
      expect(fit.props?.count).toBe(estimate?.value);
      expect(settingsFieldsFor({ h, estimate: null })).toBe(estimate?.value);
    }
    expect(settingsFormSection.layout!.owns).toEqual(["count"]);
  });
});
