import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";

const options = [
  { value: "es", label: "España" },
  { value: "mx", label: "México" },
];

describe("Select", () => {
  it("es un combobox nativo con etiqueta y opciones", () => {
    render(<Select label="País" options={options} />);
    const select = screen.getByRole("combobox", { name: "País" });
    expect(select.tagName).toBe("SELECT");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["España", "México"]);
  });

  it("el placeholder se marca hasta que se elige una opción", () => {
    const { container } = render(<Select label="País" placeholder="Elige un país" options={options} />);
    const wrapper = container.querySelector(".dl-select");
    expect(wrapper?.hasAttribute("data-placeholder")).toBe(true);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "mx" } });
    expect(wrapper?.hasAttribute("data-placeholder")).toBe(false);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("mx");
  });

  it("marca el error", () => {
    render(<Select label="Plan" options={options} error="Elige un plan" />);
    expect(screen.getByRole("combobox", { name: "Plan" }).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Elige un plan")).toBeTruthy();
  });
});
