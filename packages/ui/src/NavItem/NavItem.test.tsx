import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavItem } from "./NavItem";

describe("NavItem", () => {
  it("con href es un enlace y marca la página actual", () => {
    render(<NavItem label="Inicio" icon="home" href="/" active count={3} />);
    const link = screen.getByRole("link", { name: /Inicio/ });
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(link.textContent).toContain("3");
  });

  it("sin href es un botón; desactivado no responde", () => {
    const onClick = vi.fn();
    const { rerender } = render(<NavItem label="Informes" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Informes" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<NavItem label="Informes" href="/r" onClick={onClick} disabled />);
    const disabled = screen.getByRole("button", { name: "Informes" });
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(disabled);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
