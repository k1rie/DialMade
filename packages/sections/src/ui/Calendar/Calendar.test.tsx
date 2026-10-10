import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { fitInputFor } from "../testing/fitInput";
import { calendarSection } from "./definition";
import { fitCalendar } from "./fit";

describe("ui.calendar", () => {
  it("mes: tabla con los días de la semana del idioma y «hoy» marcado", () => {
    const { container } = renderSection(calendarSection, { locale: "es" });
    const table = screen.getByRole("table");
    expect(document.getElementById(table.getAttribute("aria-labelledby")!)?.textContent).toBe("Septiembre 2026");
    expect(within(table).getAllByRole("columnheader").map((th) => th.textContent)).toEqual(["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]);
    const today = container.querySelector('[aria-current="date"]');
    expect(today?.querySelector(".dl-ui-calendar__date")?.textContent).toBe("30");
    expect(container.querySelectorAll(".dl-ui-calendar__chip").length).toBeGreaterThan(0);
  });

  it("en inglés la semana empieza en domingo y las horas son de 12 h", () => {
    renderSection(calendarSection, { locale: "en", variant: "week" });
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(7);
    expect(document.getElementById(groups[0]!.getAttribute("aria-labelledby")!)?.textContent).toMatch(/^Sun 27$/);
    expect(document.body.textContent).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
  });

  it("semana: los eventos se colocan por hora dentro de su día", () => {
    const { container } = renderSection(calendarSection, { variant: "week" });
    const event = container.querySelector<HTMLElement>(".dl-ui-calendar__event")!;
    expect(Number(event.style.getPropertyValue("--_ui-ev-top"))).toBeGreaterThanOrEqual(0);
    expect(Number(event.style.getPropertyValue("--_ui-ev-size"))).toBeGreaterThan(0);
    expect(container.querySelector(".dl-ui-calendar__day[data-today]")).toBeTruthy();
  });

  it("agenda: próximos eventos agrupados por día, desde «Hoy»", () => {
    const { container } = renderSection(calendarSection, { variant: "agenda" });
    const labels = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(labels[0]).toBe("Hoy");
    expect(labels[1]).toBe("Mañana");
    expect(container.querySelector(".dl-ui-calendar__mobile")).toBeNull();
  });

  it("mini: números con punto en los días con eventos y el próximo evento", () => {
    const { container } = renderSection(calendarSection, { variant: "mini", locale: "en" });
    expect(container.querySelector(".dl-ui-calendar__month[data-compact]")).toBeTruthy();
    expect(container.querySelector(".dl-ui-calendar__dot")?.textContent).toBe(", with events");
    expect(container.querySelector(".dl-ui-calendar__next")?.textContent).toMatch(/^Next/);
  });

  it("móvil: la agenda va en el marcado salvo con «keep»", () => {
    const agenda = renderSection(calendarSection, { variant: "month" });
    expect(agenda.container.querySelector(".dl-ui-calendar[data-mobile-agenda] .dl-ui-calendar__mobile .dl-ui-calendar__agenda")).toBeTruthy();
    const keep = renderSection(calendarSection, { variant: "month", props: { mobile: "keep" }, elementId: "b-keep" });
    expect(keep.container.querySelector(".dl-ui-calendar__mobile")).toBeNull();
  });

  it("sin título, el calendario se nombra por el mes", () => {
    const { container } = renderSection(calendarSection, { props: { title: "" } });
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(document.getElementById(container.querySelector("section")!.getAttribute("aria-labelledby")!)?.textContent).toBe("Septiembre 2026");
  });

  it("fit: la vista del chip (nota primero, «mini» con ≤3 columnas)", () => {
    expect(fitCalendar(fitInputFor("calendar", 8, 60))).toEqual({ variant: "month", props: { mobile: "agenda", frame: "card" } });
    expect(fitCalendar(fitInputFor("calendar", 8, 30)).variant).toBe("week");
    expect(fitCalendar(fitInputFor("calendar", 3, 60)).variant).toBe("mini");
    expect(fitCalendar(fitInputFor("calendar", 5, 60)).variant).toBe("agenda");
    expect(fitCalendar(fitInputFor("calendar", 3, 60, { note: "vista semanal" })).variant).toBe("week");
  });
});
