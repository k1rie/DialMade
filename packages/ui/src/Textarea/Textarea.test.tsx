import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("tiene etiqueta y marca el error", () => {
    render(<Textarea label="Mensaje" error="Escribe algo" />);
    const textarea = screen.getByRole("textbox", { name: "Mensaje" });
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
    expect(textarea.getAttribute("rows")).toBe("4");
  });

  it("acepta previewState", () => {
    render(<Textarea aria-label="Notas" previewState="focus" />);
    expect(screen.getByRole("textbox", { name: "Notas" }).dataset.previewState).toBe("focus");
  });
});
