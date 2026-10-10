import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { activitySection } from "./definition";

describe("app.activity", () => {
  it("timeline: una entrada por actividad con persona, acción y hora", () => {
    const { container } = renderSection(activitySection);
    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items[0]?.querySelector(".dl-app-activity__actor")?.textContent).toMatch(/\S+ \S+/);
    expect(items[0]?.querySelector(".dl-app-activity__time")?.textContent).toBe("hace 4 min");
    expect(container.querySelectorAll(".dl-app-activity__node svg")).toHaveLength(5);
    expect(screen.getByRole("button", { name: /Ver todo/ })).toBeTruthy();
  });

  it("list: avatares decorativos; count recorta y el enlace se puede quitar", () => {
    const { container } = renderSection(activitySection, { variant: "list", props: { count: 3, showViewAll: false }, locale: "en" });
    expect(container.querySelector(".dl-app-activity")?.getAttribute("data-layout")).toBe("list");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(container.querySelectorAll(".dl-app-activity__avatar[aria-hidden='true'] .dl-avatar")).toHaveLength(3);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
