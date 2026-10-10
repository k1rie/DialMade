import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("es decorativo", () => {
    const { container } = render(<Skeleton shape="circle" width={48} height={48} />);
    const node = container.firstElementChild as HTMLElement;
    expect(node.getAttribute("aria-hidden")).toBe("true");
    expect(node.dataset.shape).toBe("circle");
    expect(node.style.width).toBe("48px");
  });

  it("pinta varias líneas de texto", () => {
    const { container } = render(<Skeleton lines={3} />);
    expect(container.querySelectorAll(".dl-skeleton").length).toBe(3);
  });
});
