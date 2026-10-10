import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UiProvider } from "../UiProvider";
import { Avatar } from "./Avatar";
import { AvatarGroup } from "./AvatarGroup";
import { colorIndexOf, initialsOf } from "./initials";

describe("Avatar", () => {
  it("sin foto muestra iniciales con el nombre como etiqueta", () => {
    render(<Avatar name="Lucía Navarro" />);
    const img = screen.getByRole("img", { name: "Lucía Navarro" });
    expect(img.textContent).toBe("LN");
  });

  it("con foto usa el nombre como alt y vuelve a las iniciales si falla", () => {
    render(<Avatar name="Marco Ruiz" src="/marco.png" />);
    const img = screen.getByRole("img", { name: "Marco Ruiz" });
    expect(img.tagName).toBe("IMG");
    fireEvent.error(img);
    expect(screen.getByRole("img", { name: "Marco Ruiz" }).tagName).toBe("SPAN");
  });

  it("anuncia el estado en el idioma activo", () => {
    render(
      <UiProvider locale="es">
        <Avatar name="Aiko Tanaka" status="online" />
      </UiProvider>,
    );
    expect(screen.getByText("En línea")).toBeTruthy();
  });

  it("iniciales y color son estables", () => {
    expect(initialsOf("aiko")).toBe("AI");
    expect(initialsOf("  Sam  de la Okafor ")).toBe("SO");
    expect(colorIndexOf("Nora Lind")).toBe(colorIndexOf("Nora Lind"));
  });
});

describe("AvatarGroup", () => {
  it("agrupa con nombre y cuenta los que no caben", () => {
    const items = ["Ana", "Bea", "Carla", "Dani", "Eva", "Fran"].map((name) => ({ name }));
    render(<AvatarGroup label="Equipo" items={items} max={3} />);
    const group = screen.getByRole("group", { name: "Equipo" });
    expect(group.querySelectorAll(".dl-avatar").length).toBe(4);
    expect(screen.getByRole("img", { name: "3 more" }).textContent).toBe("+3");
  });
});
