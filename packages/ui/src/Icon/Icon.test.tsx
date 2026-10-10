import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon";
import { ICON_NAMES } from "./icons";
import { isIconName, renderIcon } from "./renderIcon";

describe("Icon", () => {
  it("es decorativo sin label", () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
  });

  it("con label es una imagen con nombre", () => {
    render(<Icon name="info" label="Información" />);
    expect(screen.getByRole("img", { name: "Información" })).toBeTruthy();
  });

  it("todos los iconos tienen trazos", () => {
    for (const name of ICON_NAMES) {
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("renderIcon distingue nombres de nodos", () => {
    expect(isIconName("check")).toBe(true);
    expect(isIconName("no-existe")).toBe(false);
    const { container } = render(<>{renderIcon(<b>★</b>, "slot")}</>);
    expect(container.querySelector("span.slot")?.getAttribute("aria-hidden")).toBe("true");
  });
});
