import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("describe a su disparador", () => {
    render(
      <Tooltip content="Copiar enlace" open>
        <button type="button" aria-label="Copiar" />
      </Tooltip>,
    );
    const tooltip = screen.getByRole("tooltip");
    const trigger = screen.getByRole("button", { name: "Copiar" });
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(tooltip.closest(".dl-tooltip")?.hasAttribute("data-open")).toBe(true);
  });

  it("Esc lo oculta hasta salir", () => {
    const { container } = render(
      <Tooltip content="Ayuda" side="right">
        <button type="button">?</button>
      </Tooltip>,
    );
    const root = container.querySelector(".dl-tooltip") as HTMLElement;
    expect(root.dataset.side).toBe("right");
    fireEvent.keyDown(screen.getByRole("button"), { key: "Escape" });
    expect(root.hasAttribute("data-dismissed")).toBe(true);
    fireEvent.pointerLeave(root);
    expect(root.hasAttribute("data-dismissed")).toBe(false);
  });
});
